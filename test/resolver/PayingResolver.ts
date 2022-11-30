import Contracts from '../../components/Contracts';
import { EIP712Verifier, SchemaRegistry, SchemaResolver, TestEAS } from '../../typechain-types';
import { ZERO_BYTES32 } from '../../utils/Constants';
import { getTransactionCost } from '..//helpers/Transaction';
import { expectAttestation, expectFailedRevocation, expectRevocation, registerSchema } from '../helpers/EAS';
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
  let verifier: EIP712Verifier;
  let eas: TestEAS;
  let resolver: SchemaResolver;

  const schema = 'S';
  let schemaId: string;
  const data = '0x1234';
  const expirationTime = 0;

  const incentive = 1000;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    verifier = await Contracts.EIP712Verifier.deploy();
    eas = await Contracts.TestEAS.deploy(registry.address, verifier.address);

    await eas.setTime(await latest());

    resolver = await Contracts.PayingResolver.deploy(eas.address, incentive);
    expect(await resolver.isPayable()).to.be.true;

    await sender.sendTransaction({ to: resolver.address, value: incentive * 2 });

    schemaId = await registerSchema(schema, registry, resolver, true);
  });

  it('should incentivize attesters', async () => {
    const prevResolverBalance = await getBalance(resolver.address);
    const prevAttesterBalance = await getBalance(sender.address);

    const { res } = await expectAttestation(
      eas,
      recipient.address,
      schemaId,
      expirationTime,
      true,
      ZERO_BYTES32,
      data,
      {
        from: sender
      }
    );
    const transactionCost = await getTransactionCost(res);

    expect(await getBalance(resolver.address)).to.equal(prevResolverBalance.sub(incentive));
    expect(await getBalance(sender.address)).to.equal(prevAttesterBalance.add(incentive).sub(transactionCost));
  });

  context('with an attestation', () => {
    let uuid: string;

    beforeEach(async () => {
      ({ uuid } = await expectAttestation(eas, recipient.address, schemaId, expirationTime, true, ZERO_BYTES32, data, {
        from: sender
      }));
    });

    it('should revert when attempting to revoke an attestation without repaying the incentive', async () => {
      await expectFailedRevocation(eas, uuid, 'InvalidRevocation', { from: sender });
    });

    it('should revoke an attestation', async () => {
      const prevResolverBalance = await getBalance(resolver.address);
      const prevAttesterBalance = await getBalance(sender.address);

      const res = await expectRevocation(eas, uuid, { from: sender, value: incentive });
      const transactionCost = await getTransactionCost(res);

      expect(await getBalance(resolver.address)).to.equal(prevResolverBalance.add(incentive));
      expect(await getBalance(sender.address)).to.equal(prevAttesterBalance.sub(incentive).sub(transactionCost));
    });

    it('should revoke an attestation and refund any remainder', async () => {
      const prevResolverBalance = await getBalance(resolver.address);
      const prevAttesterBalance = await getBalance(sender.address);

      const res = await expectRevocation(eas, uuid, { from: sender, value: incentive * 10 });
      const transactionCost = await getTransactionCost(res);

      expect(await getBalance(resolver.address)).to.equal(prevResolverBalance.add(incentive));
      expect(await getBalance(sender.address)).to.equal(prevAttesterBalance.sub(incentive).sub(transactionCost));
    });
  });
});
