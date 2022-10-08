import Contracts from '../components/Contracts';
import {
  EIP712Verifier,
  SchemaRegistry,
  SchemaResolver,
  TestEAS,
  TestERC20Token,
  TestRevocationResolver
} from '../typechain-types';
import { ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../utils/Constants';
import { getSchemaUUID, getUUID } from './helpers/EAS';
import { duration, latest } from './helpers/Time';
import { createWallet } from './helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish, Wallet } from 'ethers';
import { ethers } from 'hardhat';

const {
  provider: { getBalance },
  utils: { formatBytes32String }
} = ethers;

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

      expect(await resolver.VERSION()).to.equal('0.11');
    });
  });

  describe('resolution', () => {
    const schema = formatBytes32String('AS');
    let schemaId: string;
    const expirationTime = 0;
    const data = '0x1234';
    let resolver: SchemaResolver;

    interface Options {
      from?: Wallet;
      value?: BigNumberish;
      bump?: number;
    }

    const expectAttestation = async (
      recipient: string,
      schema: string,
      expirationTime: number,
      refUUID: string,
      data: any,
      options?: Options
    ) => {
      const txSender = options?.from || sender;

      const res = await eas
        .connect(txSender)
        .attest(recipient, schema, expirationTime, refUUID, data, { value: options?.value });

      const uuid = getUUID(
        schema,
        recipient,
        txSender.address,
        await eas.getTime(),
        expirationTime,
        data,
        options?.bump ?? 0
      );

      await expect(res).to.emit(eas, 'Attested').withArgs(recipient, txSender.address, uuid, schema);

      const attestation = await eas.getAttestation(uuid);
      expect(attestation.uuid).to.equal(uuid);
      expect(attestation.schema).to.equal(schema);
      expect(attestation.recipient).to.equal(recipient);
      expect(attestation.attester).to.equal(txSender.address);
      expect(attestation.time).to.equal(await eas.getTime());
      expect(attestation.expirationTime).to.equal(expirationTime);
      expect(attestation.revocationTime).to.equal(0);
      expect(attestation.refUUID).to.equal(refUUID);
      expect(attestation.data).to.equal(data);

      return uuid;
    };

    const expectFailedAttestation = async (
      recipient: string,
      as: string,
      expirationTime: number,
      refUUID: string,
      data: any,
      err: string,
      options?: Options
    ) => {
      const txSender = options?.from || sender;

      await expect(
        eas.connect(txSender).attest(recipient, as, expirationTime, refUUID, data, { value: options?.value })
      ).to.be.revertedWith(err);
    };

    const expectRevocation = async (uuid: string, options?: Options) => {
      const txSender = options?.from || sender;

      const res = await eas.connect(txSender).revoke(uuid);

      await expect(res).to.emit(eas, 'Revoked').withArgs(recipient.address, txSender.address, uuid, schemaId);

      const attestation = await eas.getAttestation(uuid);
      expect(attestation.revocationTime).to.equal(await eas.getTime());
    };

    const expectFailedRevocation = async (uuid: string, err: string, options?: Options) => {
      const txSender = options?.from || sender;

      await expect(eas.connect(txSender).revoke(uuid)).to.be.revertedWith(err);
    };

    const registerSchema = async (schema: string, resolver: SchemaResolver | string) => {
      const address = typeof resolver === 'string' ? resolver : resolver.address;
      await registry.register(schema, address);

      return getSchemaUUID(schema, address);
    };

    context('with a standard resolver', () => {
      beforeEach(async () => {
        resolver = await Contracts.TestSchemaResolver.deploy(eas.address);
        schemaId = await registerSchema(schema, resolver);
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

        schemaId = await registerSchema(schema, resolver);
      });

      it('should revert when sending', async () => {
        await expect(sender.sendTransaction({ to: resolver.address, value: 1 })).to.be.revertedWith('NotPayable');
        await expectFailedAttestation(recipient.address, schemaId, expirationTime, ZERO_BYTES32, data, 'NotPayable', {
          value: 1
        });
      });
    });

    context('with a recipient resolver', () => {
      let targetRecipient: SignerWithAddress;

      beforeEach(async () => {
        targetRecipient = accounts[5];

        const resolver = await Contracts.TestRecipientResolver.deploy(eas.address, targetRecipient.address);
        expect(await resolver.isPayable()).to.be.false;

        schemaId = await registerSchema(schema, resolver);
      });

      it('should revert when attesting to a wrong recipient', async () => {
        await expectFailedAttestation(
          recipient.address,
          schemaId,
          expirationTime,
          ZERO_BYTES32,
          data,
          'InvalidAttestation'
        );
      });

      it('should allow attesting to the correct recipient', async () => {
        await expectAttestation(targetRecipient.address, schemaId, expirationTime, ZERO_BYTES32, data);
      });
    });

    context('with data resolver', () => {
      beforeEach(async () => {
        const resolver = await Contracts.TestDataResolver.deploy(eas.address);
        expect(await resolver.isPayable()).to.be.false;

        schemaId = await registerSchema(schema, resolver);
      });

      it('should revert when attesting with wrong data', async () => {
        await expectFailedAttestation(
          recipient.address,
          schemaId,
          expirationTime,
          ZERO_BYTES32,
          '0x1234',
          'InvalidAttestation'
        );

        await expectFailedAttestation(
          recipient.address,
          schemaId,
          expirationTime,
          ZERO_BYTES32,
          '0x02',
          'InvalidAttestation'
        );
      });

      it('should allow attesting with correct data', async () => {
        await expectAttestation(recipient.address, schemaId, expirationTime, ZERO_BYTES32, '0x00');
        await expectAttestation(recipient.address, schemaId, expirationTime, ZERO_BYTES32, '0x01');
      });
    });

    context('with an expiration time resolver', () => {
      let validAfter: number;

      beforeEach(async () => {
        validAfter = (await eas.getTime()) + duration.years(1);

        const resolver = await Contracts.TestExpirationTimeResolver.deploy(eas.address, validAfter);
        expect(await resolver.isPayable()).to.be.false;

        schemaId = await registerSchema(schema, resolver);
      });

      it('should revert when attesting with a wrong expiration time', async () => {
        await expectFailedAttestation(
          recipient.address,
          schemaId,
          validAfter - duration.days(1),
          ZERO_BYTES32,
          data,
          'InvalidAttestation'
        );
      });

      it('should allow attesting with the correct expiration time', async () => {
        await expectAttestation(recipient.address, schemaId, validAfter + duration.seconds(1), ZERO_BYTES32, data);
      });
    });

    context('with an attester resolver', () => {
      let sender2: Wallet;
      let targetSender: Wallet;

      beforeEach(async () => {
        sender2 = await createWallet();
        targetSender = sender2;

        const resolver = await Contracts.TestAttesterResolver.deploy(eas.address, targetSender.address);
        expect(await resolver.isPayable()).to.be.false;

        schemaId = await registerSchema(schema, resolver);
      });

      it('should revert when attesting to the wrong attester', async () => {
        await expectFailedAttestation(
          recipient.address,
          schemaId,
          expirationTime,
          ZERO_BYTES32,
          data,
          'InvalidAttestation',
          {
            from: sender
          }
        );
      });

      it('should allow attesting to the correct attester', async () => {
        await expectAttestation(recipient.address, schemaId, expirationTime, ZERO_BYTES32, data, {
          from: targetSender
        });
      });
    });

    context('with a token resolver', () => {
      const targetAmount = 22334;
      let token: TestERC20Token;

      beforeEach(async () => {
        token = await Contracts.TestERC20Token.deploy('TKN', 'TKN', 9999999999);
        await token.transfer(sender.address, targetAmount);

        resolver = await Contracts.TestTokenResolver.deploy(eas.address, token.address, targetAmount);
        expect(await resolver.isPayable()).to.be.false;

        schemaId = await registerSchema(schema, resolver);
      });

      it('should revert when attesting with wrong token amount', async () => {
        await expectFailedAttestation(
          recipient.address,
          schemaId,
          expirationTime,
          ZERO_BYTES32,
          data,
          'ERC20: insufficient allowance'
        );

        await token.connect(sender).approve(resolver.address, targetAmount - 1);
        await expectFailedAttestation(
          recipient.address,
          schemaId,
          expirationTime,
          ZERO_BYTES32,
          data,
          'ERC20: insufficient allowance'
        );
      });

      it('should allow attesting with correct token amount', async () => {
        await token.connect(sender).approve(resolver.address, targetAmount);
        await expectAttestation(recipient.address, schemaId, expirationTime, ZERO_BYTES32, data);
      });
    });

    context('with an attestation resolver', () => {
      const schema2 = formatBytes32String('AS2');
      const schema2Id = getSchemaUUID(schema2, ZERO_ADDRESS);
      let uuid: string;

      beforeEach(async () => {
        await registerSchema(schema2, ZERO_ADDRESS);

        await eas.attest(recipient.address, schema2Id, expirationTime, ZERO_BYTES32, data);
        uuid = getUUID(schema2Id, recipient.address, recipient.address, await eas.getTime(), expirationTime, data, 0);

        const resolver = await Contracts.TestAttestationResolver.deploy(eas.address);
        expect(await resolver.isPayable()).to.be.false;

        schemaId = await registerSchema(schema, resolver);
      });

      it('should revert when attesting to a non-existing attestation', async () => {
        await expectFailedAttestation(
          recipient.address,
          schemaId,
          expirationTime,
          ZERO_BYTES32,
          ZERO_BYTES32,
          'InvalidAttestation'
        );
      });

      it('should allow attesting to an existing attestation', async () => {
        await expectAttestation(recipient.address, schemaId, expirationTime, ZERO_BYTES32, uuid);
      });
    });

    context('with a paying resolver', () => {
      const incentive = 1000;

      beforeEach(async () => {
        resolver = await Contracts.TestPayingResolver.deploy(eas.address, incentive);
        expect(await resolver.isPayable()).to.be.true;

        await sender.sendTransaction({ to: resolver.address, value: incentive * 2 });

        schemaId = await registerSchema(schema, resolver);
      });

      it('should incentivize attesters', async () => {
        const prevResolverBalance = await getBalance(resolver.address);
        const prevRecipientBalance = await getBalance(recipient.address);

        await expectAttestation(recipient.address, schemaId, expirationTime, ZERO_BYTES32, data);

        expect(await getBalance(resolver.address)).to.equal(prevResolverBalance.sub(incentive));
        expect(await getBalance(recipient.address)).to.equal(prevRecipientBalance.add(incentive));
      });
    });

    context('with an attestation revocation resolver', () => {
      let resolver: TestRevocationResolver;
      let uuid: string;

      beforeEach(async () => {
        resolver = await Contracts.TestRevocationResolver.deploy(eas.address);
        expect(await resolver.isPayable()).to.be.false;

        schemaId = await registerSchema(schema, resolver);

        await eas.connect(sender).attest(recipient.address, schemaId, expirationTime, ZERO_BYTES32, data);
        uuid = getUUID(schemaId, recipient.address, sender.address, await eas.getTime(), expirationTime, data, 0);
      });

      context('when revocations are allowed', () => {
        beforeEach(async () => {
          resolver.setRevocation(true);
        });

        it('should allow revoking an existing attestation', async () => {
          await expectRevocation(uuid);
        });
      });

      context('when revocations are not allowed', () => {
        beforeEach(async () => {
          resolver.setRevocation(false);
        });

        it('should revert when attempting to revoke an existing attestation', async () => {
          await expectFailedRevocation(uuid, 'InvalidRevocation');
        });
      });
    });
  });
});
