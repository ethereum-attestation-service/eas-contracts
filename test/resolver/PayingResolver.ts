import { expect } from 'chai';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../../components/Contracts';
import { SchemaRegistry, SchemaResolver, TestEAS } from '../../typechain-types';
import { NO_EXPIRATION, ZERO_BYTES32 } from '../../utils/Constants';
import { getUIDFromAttestTx } from '../../utils/EAS';
import { getTransactionCost } from '..//helpers/Transaction';
import {
  expectAttestation,
  expectFailedAttestation,
  expectFailedMultiAttestations,
  expectFailedMultiRevocations,
  expectFailedRevocation,
  expectMultiAttestations,
  expectMultiRevocations,
  expectRevocation,
  registerSchema
} from '../helpers/EAS';
import { latest } from '../helpers/Time';
import { createWallet, getBalance } from '../helpers/Wallet';

describe('PayingResolver', () => {
  let accounts: Signer[];
  let recipient: Signer;
  let sender: Signer;

  let registry: SchemaRegistry;
  let eas: TestEAS;
  let resolver: SchemaResolver;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const data = '0x1234';
  const expirationTime = NO_EXPIRATION;

  const incentive = 12345n;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(await registry.getAddress());

    await eas.setTime(await latest());

    resolver = await Contracts.PayingResolver.deploy(await eas.getAddress(), incentive);
    expect(await resolver.isPayable()).to.be.true;

    await sender.sendTransaction({ to: await resolver.getAddress(), value: incentive * 100n });

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should incentivize attesters', async () => {
    const prevResolverBalance: bigint = await getBalance(await resolver.getAddress());
    const prevAttesterBalance: bigint = await getBalance(await sender.getAddress());

    const { res } = await expectAttestation(
      { eas },
      schemaId,
      { recipient: await recipient.getAddress(), expirationTime, data },
      {
        from: sender,
        skipBalanceCheck: true
      }
    );
    let transactionCost = await getTransactionCost(res);

    expect(await getBalance(await resolver.getAddress())).to.equal(prevResolverBalance - incentive);
    expect(await getBalance(await sender.getAddress())).to.equal(prevAttesterBalance + incentive - transactionCost);

    const prevResolverBalance2: bigint = await getBalance(await resolver.getAddress());
    const prevAttesterBalance2: bigint = await getBalance(await sender.getAddress());

    const { uids, res: res2 } = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data },
            { recipient: await recipient.getAddress(), expirationTime, data }
          ]
        }
      ],
      {
        from: sender,
        skipBalanceCheck: true
      }
    );

    transactionCost = await getTransactionCost(res2);

    expect(await getBalance(await resolver.getAddress())).to.equal(
      prevResolverBalance2 - incentive * BigInt(uids.length)
    );
    expect(await getBalance(await sender.getAddress())).to.equal(
      prevAttesterBalance2 + incentive * BigInt(uids.length) - transactionCost
    );
  });

  it('should revert when attempting to send any ETH', async () => {
    await expectFailedAttestation(
      { eas },
      schemaId,
      { recipient: await recipient.getAddress(), expirationTime, data, value: 1n },
      {
        from: sender
      },
      'InvalidAttestation'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data, value: 1n },
            { recipient: await recipient.getAddress(), expirationTime, data }
          ]
        }
      ],
      {
        from: sender
      },
      'InvalidAttestations'
    );

    await expectFailedMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: await recipient.getAddress(), expirationTime, data },
            { recipient: await recipient.getAddress(), expirationTime, data, value: 1n }
          ]
        }
      ],
      {
        from: sender
      },
      'InvalidAttestations'
    );
  });

  context('with attestations', () => {
    let uid: string;
    let uids: string[] = [];

    beforeEach(async () => {
      uid = await getUIDFromAttestTx(
        eas.connect(sender).attest({
          schema: schemaId,
          data: {
            recipient: await recipient.getAddress(),
            expirationTime,
            revocable: true,
            refUID: ZERO_BYTES32,
            data,
            value: 0
          }
        })
      );

      uids = [];

      for (let i = 0; i < 2; i++) {
        uids.push(
          await getUIDFromAttestTx(
            eas.connect(sender).attest({
              schema: schemaId,
              data: {
                recipient: await recipient.getAddress(),
                expirationTime,
                revocable: true,
                refUID: ZERO_BYTES32,
                data,
                value: 0
              }
            })
          )
        );
      }
    });

    it('should revert when attempting to revoke an attestation without repaying the incentive', async () => {
      await expectFailedRevocation({ eas }, schemaId, { uid }, { from: sender }, 'InvalidRevocation');

      await expectFailedMultiRevocations(
        { eas },
        [
          {
            schema: schemaId,
            requests: [{ uid }]
          }
        ],
        { from: sender },
        'InvalidRevocation'
      );
    });

    it('should revoke attestations', async () => {
      const prevResolverBalance: bigint = await getBalance(await resolver.getAddress());
      const prevAttesterBalance: bigint = await getBalance(await sender.getAddress());

      const value = incentive;
      const res = await expectRevocation({ eas }, schemaId, { uid, value }, { from: sender });
      let transactionCost = await getTransactionCost(res);

      expect(await getBalance(await resolver.getAddress())).to.equal(prevResolverBalance + incentive);
      expect(await getBalance(await sender.getAddress())).to.equal(prevAttesterBalance - incentive - transactionCost);

      const prevResolverBalance2: bigint = await getBalance(await resolver.getAddress());
      const prevAttesterBalance2: bigint = await getBalance(await sender.getAddress());

      const res2 = await expectMultiRevocations(
        { eas },
        [
          {
            schema: schemaId,
            requests: uids.map((uid) => ({ uid, value }))
          }
        ],
        { from: sender, skipBalanceCheck: true }
      );

      transactionCost = await getTransactionCost(res2);

      expect(await getBalance(await resolver.getAddress())).to.equal(
        prevResolverBalance2 + incentive * BigInt(uids.length)
      );
      expect(await getBalance(await sender.getAddress())).to.equal(
        prevAttesterBalance2 - incentive * BigInt(uids.length) - transactionCost
      );
    });

    it('should revoke attestations and refund any remainder', async () => {
      const prevResolverBalance: bigint = await getBalance(await resolver.getAddress());
      const prevAttesterBalance: bigint = await getBalance(await sender.getAddress());

      const value = incentive * 10n;
      const res = await expectRevocation({ eas }, schemaId, { uid, value }, { from: sender, skipBalanceCheck: true });
      let transactionCost = await getTransactionCost(res);

      expect(await getBalance(await resolver.getAddress())).to.equal(prevResolverBalance + incentive);
      expect(await getBalance(await sender.getAddress())).to.equal(prevAttesterBalance - incentive - transactionCost);

      const prevResolverBalance2: bigint = await getBalance(await resolver.getAddress());
      const prevAttesterBalance2: bigint = await getBalance(await sender.getAddress());

      const res2 = await expectMultiRevocations(
        { eas },
        [
          {
            schema: schemaId,
            requests: uids.map((uid) => ({ uid, value }))
          }
        ],
        { from: sender, skipBalanceCheck: true }
      );

      transactionCost = await getTransactionCost(res2);

      expect(await getBalance(await resolver.getAddress())).to.equal(
        prevResolverBalance2 + incentive * BigInt(uids.length)
      );
      expect(await getBalance(await sender.getAddress())).to.equal(
        prevAttesterBalance2 - incentive * BigInt(uids.length) - transactionCost
      );
    });

    it('should revert when attempting to revert with more value than was actually sent', async () => {
      const value = incentive;

      await expectFailedRevocation(
        { eas },
        schemaId,
        { uid, value: value + 1000n },
        { from: sender, value },
        'InsufficientValue'
      );

      await expectFailedMultiRevocations(
        { eas },
        [{ schema: schemaId, requests: [{ uid, value: value + 1000n }] }],
        { from: sender, value },
        'InsufficientValue'
      );
    });

    it('should allow reverting with the correct value when accidentally sending too much', async () => {
      const prevResolverBalance: bigint = await getBalance(await resolver.getAddress());
      const prevAttesterBalance: bigint = await getBalance(await sender.getAddress());

      const value = incentive;
      const res = await expectRevocation(
        { eas },
        schemaId,
        { uid, value },
        {
          from: sender,
          value: value + 1000n,
          skipBalanceCheck: true
        }
      );
      let transactionCost = await getTransactionCost(res);

      expect(await getBalance(await resolver.getAddress())).to.equal(prevResolverBalance + incentive);
      expect(await getBalance(await sender.getAddress())).to.equal(prevAttesterBalance - incentive - transactionCost);

      const prevResolverBalance2: bigint = await getBalance(await resolver.getAddress());
      const prevAttesterBalance2: bigint = await getBalance(await sender.getAddress());

      const res2 = await expectMultiRevocations(
        { eas },
        [
          {
            schema: schemaId,
            requests: uids.map((uid) => ({ uid, value }))
          }
        ],
        { from: sender, value: value * 10n, skipBalanceCheck: true }
      );

      transactionCost = await getTransactionCost(res2);

      expect(await getBalance(await resolver.getAddress())).to.equal(
        prevResolverBalance2 + incentive * BigInt(uids.length)
      );
      expect(await getBalance(await sender.getAddress())).to.equal(
        prevAttesterBalance2 - incentive * BigInt(uids.length) - transactionCost
      );
    });
  });
});
