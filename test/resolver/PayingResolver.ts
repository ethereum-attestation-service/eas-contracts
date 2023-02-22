import Contracts from '../../components/Contracts';
import { SchemaRegistry, SchemaResolver, TestEAS } from '../../typechain-types';
import { ZERO_BYTES32 } from '../../utils/Constants';
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
import { createWallet } from '../helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

const {
  provider: { getBalance }
} = ethers;

describe('PayingResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let eas: TestEAS;
  let resolver: SchemaResolver;

  const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
  let schemaId: string;
  const data = '0x1234';
  const expirationTime = 0;

  const incentive = 12345;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address);

    await eas.setTime(await latest());

    resolver = await Contracts.PayingResolver.deploy(eas.address, incentive);
    expect(await resolver.isPayable()).to.be.true;

    await sender.sendTransaction({ to: resolver.address, value: incentive * 100 });

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should incentivize attesters', async () => {
    const prevResolverBalance = await getBalance(resolver.address);
    const prevAttesterBalance = await getBalance(sender.address);

    const { res } = await expectAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime, data },
      {
        from: sender,
        skipBalanceCheck: true
      }
    );
    let transactionCost = await getTransactionCost(res);

    expect(await getBalance(resolver.address)).to.equal(prevResolverBalance.sub(incentive));
    expect(await getBalance(sender.address)).to.equal(prevAttesterBalance.add(incentive).sub(transactionCost));

    const prevResolverBalance2 = await getBalance(resolver.address);
    const prevAttesterBalance2 = await getBalance(sender.address);

    const { uids, res: res2 } = await expectMultiAttestations(
      { eas },
      [
        {
          schema: schemaId,
          requests: [
            { recipient: recipient.address, expirationTime, data },
            { recipient: recipient.address, expirationTime, data }
          ]
        }
      ],
      {
        from: sender,
        skipBalanceCheck: true
      }
    );

    transactionCost = await getTransactionCost(res2);

    expect(await getBalance(resolver.address)).to.equal(prevResolverBalance2.sub(incentive * uids.length));
    expect(await getBalance(sender.address)).to.equal(
      prevAttesterBalance2.add(incentive * uids.length).sub(transactionCost)
    );
  });

  it('should revert when attempting to send any ETH', async () => {
    await expectFailedAttestation(
      { eas },
      schemaId,
      { recipient: recipient.address, expirationTime, data, value: 1 },
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
            { recipient: recipient.address, expirationTime, data, value: 1 },
            { recipient: recipient.address, expirationTime, data }
          ]
        }
      ],
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
            { recipient: recipient.address, expirationTime, data },
            { recipient: recipient.address, expirationTime, data, value: 1 }
          ]
        }
      ],
      {
        from: sender
      },
      'InvalidAttestation'
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
            recipient: recipient.address,
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
                recipient: recipient.address,
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
        [{ schema: schemaId, requests: [{ uid }, { uid, value: incentive }] }],
        { from: sender },
        'InvalidRevocation'
      );

      await expectFailedMultiRevocations(
        { eas },
        [{ schema: schemaId, requests: [{ uid, value: incentive }, { uid }] }],
        { from: sender },
        'InvalidRevocation'
      );
    });

    it('should revoke attestations', async () => {
      const prevResolverBalance = await getBalance(resolver.address);
      const prevAttesterBalance = await getBalance(sender.address);

      const value = incentive;
      const res = await expectRevocation({ eas }, schemaId, { uid, value }, { from: sender });
      let transactionCost = await getTransactionCost(res);

      expect(await getBalance(resolver.address)).to.equal(prevResolverBalance.add(incentive));
      expect(await getBalance(sender.address)).to.equal(prevAttesterBalance.sub(incentive).sub(transactionCost));

      const prevResolverBalance2 = await getBalance(resolver.address);
      const prevAttesterBalance2 = await getBalance(sender.address);

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

      expect(await getBalance(resolver.address)).to.equal(prevResolverBalance2.add(incentive * uids.length));
      expect(await getBalance(sender.address)).to.equal(
        prevAttesterBalance2.sub(incentive * uids.length).sub(transactionCost)
      );
    });

    it('should revoke attestations and refund any remainder', async () => {
      const prevResolverBalance = await getBalance(resolver.address);
      const prevAttesterBalance = await getBalance(sender.address);

      const value = incentive * 10;
      const res = await expectRevocation({ eas }, schemaId, { uid, value }, { from: sender, skipBalanceCheck: true });
      let transactionCost = await getTransactionCost(res);

      expect(await getBalance(resolver.address)).to.equal(prevResolverBalance.add(incentive));
      expect(await getBalance(sender.address)).to.equal(prevAttesterBalance.sub(incentive).sub(transactionCost));

      const prevResolverBalance2 = await getBalance(resolver.address);
      const prevAttesterBalance2 = await getBalance(sender.address);

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

      expect(await getBalance(resolver.address)).to.equal(prevResolverBalance2.add(incentive * uids.length));
      expect(await getBalance(sender.address)).to.equal(
        prevAttesterBalance2.sub(incentive * uids.length).sub(transactionCost)
      );
    });

    it('should revert when attempting to revert with more value than was actually sent', async () => {
      const value = incentive;

      await expectFailedRevocation(
        { eas },
        schemaId,
        { uid, value: value + 1000 },
        { from: sender, value },
        'InsufficientValue'
      );

      await expectFailedMultiRevocations(
        { eas },
        [{ schema: schemaId, requests: [{ uid, value: value + 1000 }, { uid }] }],
        { from: sender, value },
        'InsufficientValue'
      );

      await expectFailedMultiRevocations(
        { eas },
        [{ schema: schemaId, requests: [{ uid }, { uid, value: value + 1000 }] }],
        { from: sender, value },
        'InsufficientValue'
      );
    });

    it('should allow reverting with the correct value when accidentally sending too much', async () => {
      const prevResolverBalance = await getBalance(resolver.address);
      const prevAttesterBalance = await getBalance(sender.address);

      const value = incentive;
      const res = await expectRevocation(
        { eas },
        schemaId,
        { uid, value },
        {
          from: sender,
          value: value + 1000,
          skipBalanceCheck: true
        }
      );
      let transactionCost = await getTransactionCost(res);

      expect(await getBalance(resolver.address)).to.equal(prevResolverBalance.add(incentive));
      expect(await getBalance(sender.address)).to.equal(prevAttesterBalance.sub(incentive).sub(transactionCost));

      const prevResolverBalance2 = await getBalance(resolver.address);
      const prevAttesterBalance2 = await getBalance(sender.address);

      const res2 = await expectMultiRevocations(
        { eas },
        [
          {
            schema: schemaId,
            requests: uids.map((uid) => ({ uid, value }))
          }
        ],
        { from: sender, value: value * 10, skipBalanceCheck: true }
      );

      transactionCost = await getTransactionCost(res2);

      expect(await getBalance(resolver.address)).to.equal(prevResolverBalance2.add(incentive * uids.length));
      expect(await getBalance(sender.address)).to.equal(
        prevAttesterBalance2.sub(incentive * uids.length).sub(transactionCost)
      );
    });
  });
});
