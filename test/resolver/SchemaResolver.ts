import { expect } from 'chai';
import { Signer } from 'ethers';
import { ethers } from 'hardhat';
import Contracts from '../../components/Contracts';
import { SchemaRegistry, SchemaResolver, TestEAS } from '../../typechain-types';
import { NO_EXPIRATION, ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../../utils/Constants';
import { expectFailedAttestation, expectFailedMultiAttestations, registerSchema } from '../helpers/EAS';
import { latest } from '../helpers/Time';
import { createWallet } from '../helpers/Wallet';

describe('SchemaResolver', () => {
  let accounts: Signer[];
  let recipient: Signer;
  let sender: Signer;

  let registry: SchemaRegistry;
  let eas: TestEAS;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    eas = await Contracts.TestEAS.deploy(await registry.getAddress());

    await eas.setTime(await latest());
  });

  describe('construction', () => {
    it('should revert when initialized with an invalid EAS', async () => {
      const resolver = await Contracts.TestSchemaResolver.deploy(await eas.getAddress());
      await expect(Contracts.TestSchemaResolver.deploy(ZERO_ADDRESS)).to.be.revertedWithCustomError(
        resolver,
        'InvalidEAS'
      );
    });

    it('should be properly initialized', async () => {
      const resolver = await Contracts.TestSchemaResolver.deploy(await eas.getAddress());

      expect(await resolver.version()).to.equal('1.1.0');
    });
  });

  describe('resolution', () => {
    const schema = 'bytes32 eventId,uint8 ticketType,uint32 ticketNum';
    let schemaId: string;
    const expirationTime = NO_EXPIRATION;
    const data = '0x1234';
    let resolver: SchemaResolver;

    context('with a standard resolver', () => {
      beforeEach(async () => {
        resolver = await Contracts.TestSchemaResolver.deploy(await eas.getAddress());
        schemaId = await registerSchema(schema, registry, resolver, true);
      });

      it('should revert when the attestation callback is invoked directly', async () => {
        const attestation = {
          uid: ZERO_BYTES32,
          schema: ZERO_BYTES32,
          refUID: ZERO_BYTES32,
          time: await latest(),
          expirationTime: 0,
          revocationTime: 0,
          revocable: true,
          recipient: await recipient.getAddress(),
          attester: await sender.getAddress(),
          data: ZERO_BYTES
        };

        await expect(resolver.attest(attestation)).to.be.revertedWithCustomError(resolver, 'AccessDenied');
        await expect(resolver.multiAttest([attestation, attestation], [0, 0])).to.be.revertedWithCustomError(
          resolver,
          'AccessDenied'
        );
      });

      it('should revert when the attestation revocation callback is invoked directly', async () => {
        const attestation = {
          uid: ZERO_BYTES32,
          schema: ZERO_BYTES32,
          refUID: ZERO_BYTES32,
          time: await latest(),
          expirationTime: 0,
          revocationTime: 0,
          revocable: true,
          recipient: await recipient.getAddress(),
          attester: await sender.getAddress(),
          data: ZERO_BYTES
        };

        await expect(resolver.revoke(attestation)).to.be.revertedWithCustomError(resolver, 'AccessDenied');
        await expect(resolver.multiRevoke([attestation, attestation], [0, 0])).to.be.revertedWithCustomError(
          resolver,
          'AccessDenied'
        );
      });

      context('as an EAS', () => {
        let sender: Signer;

        before(() => {
          sender = accounts[0];
        });

        beforeEach(async () => {
          resolver = await Contracts.TestSchemaResolver.deploy(await sender.getAddress());
        });

        it('should revert when attempting to multi attest with more value than was actually sent', async () => {
          const attestation = {
            uid: ZERO_BYTES32,
            schema: ZERO_BYTES32,
            refUID: ZERO_BYTES32,
            time: await latest(),
            expirationTime: 0,
            revocationTime: 0,
            revocable: true,
            recipient: await recipient.getAddress(),
            attester: await sender.getAddress(),
            data: ZERO_BYTES
          };
          const value = 12345;

          await expect(
            resolver.multiAttest([attestation, attestation], [value, value], { value })
          ).to.be.revertedWithCustomError(resolver, 'InsufficientValue');
          await expect(
            resolver.multiAttest([attestation, attestation], [value - 1, 2], { value })
          ).to.be.revertedWithCustomError(resolver, 'InsufficientValue');
        });

        it('should revert when attempting to multi revoke with more value than was actually sent', async () => {
          const attestation = {
            uid: ZERO_BYTES32,
            schema: ZERO_BYTES32,
            refUID: ZERO_BYTES32,
            time: await latest(),
            expirationTime: 0,
            revocationTime: 0,
            revocable: true,
            recipient: await recipient.getAddress(),
            attester: await sender.getAddress(),
            data: ZERO_BYTES
          };
          const value = 12345;

          await expect(
            resolver.multiRevoke([attestation, attestation], [value, value], { value })
          ).to.be.revertedWithCustomError(resolver, 'InsufficientValue');
          await expect(
            resolver.multiRevoke([attestation, attestation], [value - 1, 2], { value })
          ).to.be.revertedWithCustomError(resolver, 'InsufficientValue');
        });
      });
    });

    context('with a non-payable resolver', () => {
      beforeEach(async () => {
        resolver = await Contracts.TestSchemaResolver.deploy(await eas.getAddress());
        expect(await resolver.isPayable()).to.be.false;

        schemaId = await registerSchema(schema, registry, resolver, true);
      });

      it('should revert when sending', async () => {
        const value = 1n;

        await expect(sender.sendTransaction({ to: await resolver.getAddress(), value })).to.be.revertedWithCustomError(
          resolver,
          'NotPayable'
        );

        await expectFailedAttestation(
          { eas },
          schemaId,
          { recipient: await recipient.getAddress(), expirationTime, data, value },
          { value, from: sender },
          'NotPayable'
        );

        await expectFailedMultiAttestations(
          { eas },
          [
            {
              schema: schemaId,
              requests: [
                { recipient: await recipient.getAddress(), expirationTime, data, value },
                { recipient: await recipient.getAddress(), expirationTime, data, value }
              ]
            }
          ],
          { value, from: sender },
          'NotPayable'
        );
      });
    });

    context('without any resolvers', () => {
      beforeEach(async () => {
        schemaId = await registerSchema(schema, registry, ZERO_ADDRESS, true);
      });

      it('should revert when sending', async () => {
        const value = 1n;

        await expectFailedAttestation(
          { eas },
          schemaId,
          { recipient: await recipient.getAddress(), expirationTime, data, value },
          { value, from: sender },
          'NotPayable'
        );

        await expectFailedMultiAttestations(
          { eas },
          [
            {
              schema: schemaId,
              requests: [
                { recipient: await recipient.getAddress(), expirationTime, data, value },
                { recipient: await recipient.getAddress(), expirationTime, data, value }
              ]
            }
          ],
          { value, from: sender },
          'NotPayable'
        );
      });
    });
  });
});
