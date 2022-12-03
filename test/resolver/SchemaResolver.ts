import Contracts from '../../components/Contracts';
import { EIP712Verifier, SchemaRegistry, SchemaResolver, TestEAS } from '../../typechain-types';
import { ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../../utils/Constants';
import { expectFailedAttestation, registerSchema } from '../helpers/EAS';
import { latest } from '../helpers/Time';
import { createWallet } from '../helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

describe('SchemaResolver', () => {
  let accounts: SignerWithAddress[];
  let recipient: SignerWithAddress;
  let sender: Wallet;

  let registry: SchemaRegistry;
  let verifier: EIP712Verifier;
  let eas: TestEAS;

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
  });

  describe('construction', () => {
    it('should revert when initialized with an invalid EAS', async () => {
      await expect(Contracts.TestSchemaResolver.deploy(ZERO_ADDRESS)).to.be.revertedWith('InvalidEAS');
    });

    it('should be properly initialized', async () => {
      const resolver = await Contracts.TestSchemaResolver.deploy(eas.address);

      expect(await resolver.VERSION()).to.equal('0.18');
    });
  });

  describe('resolution', () => {
    const schema = 'S';
    let schemaId: string;
    const expirationTime = 0;
    const data = '0x1234';
    let resolver: SchemaResolver;

    context('with a standard resolver', () => {
      beforeEach(async () => {
        resolver = await Contracts.TestSchemaResolver.deploy(eas.address);
        schemaId = await registerSchema(schema, registry, resolver, true);
      });

      it('should revert when the attestation callback is invoked directly', async () => {
        await expect(
          resolver.attest({
            uuid: ZERO_BYTES32,
            schema: ZERO_BYTES32,
            refUUID: ZERO_BYTES32,
            time: await latest(),
            expirationTime: 0,
            revocationTime: 0,
            revocable: true,
            recipient: recipient.address,
            attester: sender.address,
            data: ZERO_BYTES
          })
        ).to.be.revertedWith('AccessDenied');
      });

      it('should revert when the attestation revocation callback is invoked directly', async () => {
        await expect(
          resolver.revoke({
            uuid: ZERO_BYTES32,
            schema: ZERO_BYTES32,
            refUUID: ZERO_BYTES32,
            time: await latest(),
            expirationTime: 0,
            revocationTime: 0,
            revocable: true,
            recipient: recipient.address,
            attester: sender.address,
            data: ZERO_BYTES
          })
        ).to.be.revertedWith('AccessDenied');
      });
    });

    context('with a non-payable resolver', () => {
      beforeEach(async () => {
        resolver = await Contracts.TestSchemaResolver.deploy(eas.address);
        expect(await resolver.isPayable()).to.be.false;

        schemaId = await registerSchema(schema, registry, resolver, true);
      });

      it('should revert when sending', async () => {
        await expect(sender.sendTransaction({ to: resolver.address, value: 1 })).to.be.revertedWith('NotPayable');
        await expectFailedAttestation(
          eas,
          recipient.address,
          schemaId,
          expirationTime,
          true,
          ZERO_BYTES32,
          data,
          'NotPayable',
          {
            value: 1,
            from: sender
          }
        );
      });
    });
  });
});
