import Contracts from '../components/Contracts';
import {
  EIP712Verifier,
  SchemaRegistry,
  TestEAS,
  TestERC20Token,
  TestPayingResolver,
  TestTokenResolver
} from '../typechain-types';
import { ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../utils/Constants';
import { EIP712Utils } from './helpers/EIP712Utils';
import { duration, latest } from './helpers/Time';
import { createWallet } from './helpers/Wallet';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish, Wallet } from 'ethers';
import { ethers } from 'hardhat';

const {
  provider: { getBalance }
} = ethers;

const {
  utils: { formatBytes32String, hexlify, solidityKeccak256 }
} = ethers;

describe('EAS', () => {
  let accounts: SignerWithAddress[];
  let sender: Wallet;
  let sender2: Wallet;
  let recipient: SignerWithAddress;
  let recipient2: SignerWithAddress;

  let registry: SchemaRegistry;
  let verifier: EIP712Verifier;
  let eas: TestEAS;
  let eip712Utils: EIP712Utils;
  let token: TestERC20Token;

  before(async () => {
    accounts = await ethers.getSigners();

    [recipient, recipient2] = accounts;
  });

  beforeEach(async () => {
    sender = await createWallet();
    sender2 = await createWallet();

    registry = await Contracts.SchemaRegistry.deploy();
    verifier = await Contracts.EIP712Verifier.deploy();
    eip712Utils = new EIP712Utils(verifier.address);

    eas = await Contracts.TestEAS.deploy(registry.address, verifier.address);

    const now = await latest();
    expect(await eas.getTime()).to.equal(now);
    await eas.setTime(now);
    expect(await eas.getTime()).to.equal(now);
  });

  describe('construction', async () => {
    it('should be properly initialized', async () => {
      expect(await eas.VERSION()).to.equal('0.10');
      expect(await eas.getSchemaRegistry()).to.equal(registry.address);
      expect(await eas.getEIP712Verifier()).to.equal(verifier.address);
    });

    it('should revert when initialized with an empty schema registry', async () => {
      await expect(Contracts.EAS.deploy(ZERO_ADDRESS, verifier.address)).to.be.revertedWith('InvalidRegistry');
    });

    it('should revert when initialized with an empty EIP712 verifier', async () => {
      await expect(Contracts.EAS.deploy(registry.address, ZERO_ADDRESS)).to.be.revertedWith('InvalidVerifier');
    });
  });

  interface Options {
    from?: Wallet;
    value?: BigNumberish;
    bump?: number;
  }

  const getSchemaUUID = (schema: string, resolver: string) =>
    solidityKeccak256(['bytes', 'address'], [schema, resolver]);
  const getUUID = (
    schema: string,
    recipient: string,
    attester: string,
    time: number,
    expirationTime: number,
    data: string,
    bump: number
  ) =>
    solidityKeccak256(
      ['bytes', 'address', 'address', 'uint32', 'uint32', 'bytes', 'uint32'],
      [schema, recipient, attester, time, expirationTime, data, bump]
    );

  describe('attesting', async () => {
    let expirationTime: number;
    const data = '0x1234';

    beforeEach(async () => {
      expirationTime = (await eas.getTime()) + duration.days(30);
    });

    for (const delegation of [false, true]) {
      context(`${delegation ? 'via an EIP712 delegation' : 'directly'}`, async () => {
        const testAttestation = async (
          recipient: string,
          schema: string,
          expirationTime: number,
          refUUID: string,
          data: any,
          options?: Options
        ) => {
          const txSender = options?.from || sender;

          let res;

          if (!delegation) {
            res = await eas
              .connect(txSender)
              .attest(recipient, schema, expirationTime, refUUID, data, { value: options?.value });
          } else {
            const request = await eip712Utils.getAttestationRequest(
              recipient,
              schema,
              expirationTime,
              refUUID,
              data,
              await verifier.getNonce(txSender.address),
              Buffer.from(txSender.privateKey.slice(2), 'hex')
            );

            res = await eas
              .connect(txSender)
              .attestByDelegation(
                recipient,
                schema,
                expirationTime,
                refUUID,
                data,
                txSender.address,
                request.v,
                hexlify(request.r),
                hexlify(request.s),
                { value: options?.value }
              );
          }

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

        const testFailedAttestation = async (
          recipient: string,
          as: string,
          expirationTime: number,
          refUUID: string,
          data: any,
          err: string,
          options?: Options
        ) => {
          const txSender = options?.from || sender;

          if (!delegation) {
            await expect(
              eas.connect(txSender).attest(recipient, as, expirationTime, refUUID, data, { value: options?.value })
            ).to.be.revertedWith(err);
          } else {
            const request = await eip712Utils.getAttestationRequest(
              recipient,
              as,
              expirationTime,
              refUUID,
              data,
              await verifier.getNonce(txSender.address),
              Buffer.from(txSender.privateKey.slice(2), 'hex')
            );

            await expect(
              eas
                .connect(txSender)
                .attestByDelegation(
                  recipient,
                  as,
                  expirationTime,
                  refUUID,
                  data,
                  txSender.address,
                  request.v,
                  hexlify(request.r),
                  hexlify(request.s),
                  { value: options?.value }
                )
            ).to.be.revertedWith(err);
          }
        };

        it('should revert when attesting to an unregistered schema', async () => {
          await testFailedAttestation(
            recipient.address,
            formatBytes32String('BAD'),
            expirationTime,
            ZERO_BYTES32,
            data,
            'InvalidSchema'
          );
        });

        context('with registered schemas', async () => {
          const schema1 = formatBytes32String('AS1');
          const schema2 = formatBytes32String('AS2');
          const schema3 = formatBytes32String('AS3');
          const schema1Id = getSchemaUUID(schema1, ZERO_ADDRESS);
          const schema2Id = getSchemaUUID(schema2, ZERO_ADDRESS);
          const schema3Id = getSchemaUUID(schema3, ZERO_ADDRESS);

          beforeEach(async () => {
            await registry.register(schema1, ZERO_ADDRESS);
            await registry.register(schema2, ZERO_ADDRESS);
            await registry.register(schema3, ZERO_ADDRESS);
          });

          it('should revert when attesting with passed expiration time', async () => {
            const expired = (await eas.getTime()) - duration.days(1);
            await testFailedAttestation(
              recipient.address,
              schema1Id,
              expired,
              ZERO_BYTES32,
              data,
              'InvalidExpirationTime'
            );
          });

          it('should allow attestation to an empty recipient', async () => {
            await testAttestation(ZERO_ADDRESS, schema1Id, expirationTime, ZERO_BYTES32, data);
          });

          it('should allow self attestations', async () => {
            await testAttestation(sender.address, schema2Id, expirationTime, ZERO_BYTES32, data, { from: sender });
          });

          it('should allow multiple attestations', async () => {
            await testAttestation(recipient.address, schema1Id, expirationTime, ZERO_BYTES32, data);
            await testAttestation(recipient2.address, schema1Id, expirationTime, ZERO_BYTES32, data);
          });

          it('should allow multiple attestations to the same schema', async () => {
            await testAttestation(recipient.address, schema3Id, expirationTime, ZERO_BYTES32, data, { bump: 0 });
            await testAttestation(recipient.address, schema3Id, expirationTime, ZERO_BYTES32, data, { bump: 1 });
            await testAttestation(recipient.address, schema3Id, expirationTime, ZERO_BYTES32, data, { bump: 2 });
          });

          it('should allow attestation without expiration time', async () => {
            await testAttestation(recipient.address, schema1Id, 0, ZERO_BYTES32, data);
          });

          it('should allow attestation without any data', async () => {
            await testAttestation(recipient.address, schema3Id, expirationTime, ZERO_BYTES32, ZERO_BYTES);
          });

          it('should store referenced attestation', async () => {
            await eas.attest(recipient.address, schema1Id, expirationTime, ZERO_BYTES32, data);
            const uuid = getUUID(
              schema1Id,
              recipient.address,
              recipient.address,
              await eas.getTime(),
              expirationTime,
              data,
              0
            );

            await testAttestation(recipient.address, schema3Id, expirationTime, uuid, data);
          });

          it('should generate unique UUIDs for similar attestations', async () => {
            const uuid1 = await testAttestation(recipient.address, schema3Id, expirationTime, ZERO_BYTES32, data, {
              bump: 0
            });
            const uuid2 = await testAttestation(recipient.address, schema3Id, expirationTime, ZERO_BYTES32, data, {
              bump: 1
            });
            const uuid3 = await testAttestation(recipient.address, schema3Id, expirationTime, ZERO_BYTES32, data, {
              bump: 2
            });
            expect(uuid1).not.to.equal(uuid2);
            expect(uuid2).not.to.equal(uuid3);
          });

          it('should revert when attesting to a non-existing attestation', async () => {
            await testFailedAttestation(
              recipient.address,
              schema3Id,
              expirationTime,
              formatBytes32String('INVALID'),
              data,
              'NotFound'
            );
          });

          it('should revert when sending ETH to a non-payable resolver', async () => {
            const schema4 = formatBytes32String('AS4');
            const targetRecipient = accounts[5];

            const resolver = await Contracts.TestRecipientResolver.deploy(targetRecipient.address);
            expect(await resolver.isPayable()).to.be.false;
            await expect(sender.sendTransaction({ to: resolver.address, value: 1 })).to.be.revertedWith('NotPayable');

            await registry.register(schema4, resolver.address);
            const schema4Id = getSchemaUUID(schema4, resolver.address);

            await testFailedAttestation(
              recipient.address,
              schema4Id,
              expirationTime,
              ZERO_BYTES32,
              data,
              'NotPayable',
              { value: 1 }
            );
          });

          context('with recipient resolver', async () => {
            const schema4 = formatBytes32String('AS4');
            let schema4Id: string;
            let targetRecipient: SignerWithAddress;

            beforeEach(async () => {
              targetRecipient = accounts[5];

              const resolver = await Contracts.TestRecipientResolver.deploy(targetRecipient.address);
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getSchemaUUID(schema4, resolver.address);
            });

            it('should revert when attesting to a wrong recipient', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'InvalidAttestation'
              );
            });

            it('should allow attesting to the correct recipient', async () => {
              await testAttestation(targetRecipient.address, schema4Id, expirationTime, ZERO_BYTES32, data);
            });
          });

          context('with data resolver', async () => {
            const schema4 = formatBytes32String('schema4Id');
            let schema4Id: string;

            beforeEach(async () => {
              const resolver = await Contracts.TestDataResolver.deploy();
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getSchemaUUID(schema4, resolver.address);
            });

            it('should revert when attesting with wrong data', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                '0x1234',
                'InvalidAttestation'
              );

              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                '0x02',
                'InvalidAttestation'
              );
            });

            it('should allow attesting with correct data', async () => {
              await testAttestation(recipient.address, schema4Id, expirationTime, ZERO_BYTES32, '0x00');
              await testAttestation(recipient.address, schema4Id, expirationTime, ZERO_BYTES32, '0x01');
            });
          });

          context('with expiration time resolver', async () => {
            const schema4 = formatBytes32String('schema4Id');
            let schema4Id: string;
            let validAfter: number;

            beforeEach(async () => {
              validAfter = (await eas.getTime()) + duration.years(1);
              const resolver = await Contracts.TestExpirationTimeResolver.deploy(validAfter);
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getSchemaUUID(schema4, resolver.address);
            });

            it('should revert when attesting with a wrong expiration time', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                validAfter - duration.days(1),
                ZERO_BYTES32,
                data,
                'InvalidAttestation'
              );
            });

            it('should allow attesting with the correct expiration time', async () => {
              await testAttestation(recipient.address, schema4Id, validAfter + duration.seconds(1), ZERO_BYTES32, data);
            });
          });

          context('with msg.sender resolver', async () => {
            const schema4 = formatBytes32String('schema4Id');
            let schema4Id: string;
            let targetSender: Wallet;

            beforeEach(async () => {
              targetSender = sender2;

              const resolver = await Contracts.TestAttesterResolver.deploy(targetSender.address);
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getSchemaUUID(schema4, resolver.address);
            });

            it('should revert when attesting to the wrong msg.sender', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'InvalidAttestation',
                {
                  from: sender
                }
              );
            });

            it('should allow attesting to the correct msg.sender', async () => {
              await testAttestation(recipient.address, schema4Id, expirationTime, ZERO_BYTES32, data, {
                from: targetSender
              });
            });
          });

          context('with msg.value resolver', async () => {
            const schema4 = formatBytes32String('schema4Id');
            let schema4Id: string;
            const targetValue = 862432;

            beforeEach(async () => {
              const resolver = await Contracts.TestValueResolver.deploy(targetValue);
              expect(await resolver.isPayable()).to.be.true;

              await registry.register(schema4, resolver.address);
              schema4Id = getSchemaUUID(schema4, resolver.address);
            });

            it('should revert when attesting with wrong msg.value', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'InvalidAttestation'
              );
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'InvalidAttestation',
                {
                  value: targetValue - 1
                }
              );
            });

            it('should allow attesting with correct msg.value', async () => {
              await testAttestation(recipient.address, schema4Id, expirationTime, ZERO_BYTES32, data, {
                value: targetValue
              });
            });
          });

          context('with token resolver', async () => {
            const schema4 = formatBytes32String('schema4Id');
            let schema4Id: string;
            const targetAmount = 22334;
            let resolver: TestTokenResolver;

            beforeEach(async () => {
              token = await Contracts.TestERC20Token.deploy('TKN', 'TKN', 9999999999);
              await token.transfer(sender.address, targetAmount);

              resolver = await Contracts.TestTokenResolver.deploy(token.address, targetAmount);
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getSchemaUUID(schema4, resolver.address);
            });

            it('should revert when attesting with wrong token amount', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'ERC20: insufficient allowance'
              );

              await token.connect(sender).approve(resolver.address, targetAmount - 1);
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'ERC20: insufficient allowance'
              );
            });

            it('should allow attesting with correct token amount', async () => {
              await token.connect(sender).approve(resolver.address, targetAmount);
              await testAttestation(recipient.address, schema4Id, expirationTime, ZERO_BYTES32, data);
            });
          });

          context('with attestation resolver', async () => {
            const schema4 = formatBytes32String('schema4Id');
            let schema4Id: string;
            let uuid: string;

            beforeEach(async () => {
              await eas.attest(recipient.address, schema1Id, expirationTime, ZERO_BYTES32, data);
              uuid = getUUID(
                schema1Id,
                recipient.address,
                recipient.address,
                await eas.getTime(),
                expirationTime,
                data,
                0
              );

              const resolver = await Contracts.TestAttestationResolver.deploy(eas.address);
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getSchemaUUID(schema4, resolver.address);
            });

            it('should revert when attesting to a non-existing attestation', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                ZERO_BYTES32,
                'InvalidAttestation'
              );
            });

            it('should allow attesting to an existing attestation', async () => {
              await testAttestation(recipient.address, schema4Id, expirationTime, ZERO_BYTES32, uuid);
            });
          });

          context('with paying resolver', async () => {
            const schema4 = formatBytes32String('schema4Id');
            let schema4Id: string;
            const incentive = 1000;
            let resolver: TestPayingResolver;

            beforeEach(async () => {
              resolver = await Contracts.TestPayingResolver.deploy(incentive);
              expect(await resolver.isPayable()).to.be.true;

              await sender.sendTransaction({ to: resolver.address, value: incentive * 2 });

              await registry.register(schema4, resolver.address);
              schema4Id = getSchemaUUID(schema4, resolver.address);
            });

            it('should incentivize attesters', async () => {
              const prevResolverBalance = await getBalance(resolver.address);
              const prevRecipient2Balance = await getBalance(recipient.address);

              await testAttestation(recipient.address, schema4Id, expirationTime, ZERO_BYTES32, data);

              expect(await getBalance(resolver.address)).to.equal(prevResolverBalance.sub(incentive));
              expect(await getBalance(recipient.address)).to.equal(prevRecipient2Balance.add(incentive));
            });
          });
        });
      });
    }

    it('should revert when delegation attesting with a wrong signature', async () => {
      await expect(
        eas.attestByDelegation(
          recipient.address,
          formatBytes32String('BAD'),
          expirationTime,
          ZERO_BYTES32,
          ZERO_BYTES32,
          sender.address,
          28,
          formatBytes32String('BAD'),
          formatBytes32String('BAD')
        )
      ).to.be.revertedWith('InvalidSignature');
    });
  });

  describe('revocation', async () => {
    const schema1 = formatBytes32String('AS1');
    const schema1Id = getSchemaUUID(schema1, ZERO_ADDRESS);
    let uuid: string;

    let expirationTime: number;
    const data = '0x1234';

    beforeEach(async () => {
      await registry.register(schema1, ZERO_ADDRESS);

      expirationTime = (await eas.getTime()) + duration.days(30);
    });

    for (const delegation of [false, true]) {
      const testRevocation = async (uuid: string, options?: Options) => {
        const txSender = options?.from || sender;
        let res;

        if (!delegation) {
          res = await eas.connect(txSender).revoke(uuid);
        } else {
          const request = await eip712Utils.getRevocationRequest(
            uuid,
            await verifier.getNonce(txSender.address),
            Buffer.from(txSender.privateKey.slice(2), 'hex')
          );

          res = await eas
            .connect(txSender)
            .revokeByDelegation(uuid, txSender.address, request.v, hexlify(request.r), hexlify(request.s));
        }

        await expect(res).to.emit(eas, 'Revoked').withArgs(recipient.address, txSender.address, uuid, schema1Id);

        const attestation = await eas.getAttestation(uuid);
        expect(attestation.revocationTime).to.equal(await eas.getTime());
      };

      const testFailedRevocation = async (uuid: string, err: string, options?: Options) => {
        const txSender = options?.from || sender;

        if (!delegation) {
          await expect(eas.connect(txSender).revoke(uuid)).to.be.revertedWith(err);
        } else {
          const request = await eip712Utils.getRevocationRequest(
            uuid,
            await verifier.getNonce(txSender.address),
            Buffer.from(txSender.privateKey.slice(2), 'hex')
          );

          await expect(
            eas.revokeByDelegation(uuid, txSender.address, request.v, hexlify(request.r), hexlify(request.s))
          ).to.be.revertedWith(err);
        }
      };

      context(`${delegation ? 'via an EIP712 delegation' : 'directly'}`, async () => {
        beforeEach(async () => {
          const res = await eas
            .connect(sender)
            .attest(recipient.address, schema1Id, expirationTime, ZERO_BYTES32, data);

          uuid = getUUID(schema1Id, recipient.address, sender.address, await eas.getTime(), expirationTime, data, 0);
        });

        it('should revert when revoking a non-existing attestation', async () => {
          await testFailedRevocation(formatBytes32String('BAD'), 'NotFound');
        });

        it("should revert when revoking a someone's else attestation", async () => {
          await testFailedRevocation(uuid, 'AccessDenied', { from: sender2 });
        });

        it('should allow to revoke an existing attestation', async () => {
          await testRevocation(uuid);
        });

        it('should revert when revoking an already revoked attestation', async () => {
          await testRevocation(uuid);
          await testFailedRevocation(uuid, 'AlreadyRevoked');
        });
      });
    }

    it('should revert when delegation revoking with a wrong signature', async () => {
      await expect(
        eas.revokeByDelegation(ZERO_BYTES32, sender.address, 28, formatBytes32String('BAD'), formatBytes32String('BAD'))
      ).to.be.revertedWith('InvalidSignature');
    });
  });
});
