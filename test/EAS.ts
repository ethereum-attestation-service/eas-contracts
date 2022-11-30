import Contracts from '../components/Contracts';
import { EIP712Verifier, SchemaRegistry, TestEAS } from '../typechain-types';
import { ZERO_ADDRESS, ZERO_BYTES, ZERO_BYTES32 } from '../utils/Constants';
import { getUUIDFromAttestTx } from './helpers/EAS';
import { EIP712Utils } from './helpers/EIP712Utils';
import { duration, latest } from './helpers/Time';
import { createWallet } from './helpers/Wallet';
import { getOffchainUUID, getSchemaUUID } from '@ethereum-attestation-service/eas-sdk';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumberish, Wallet } from 'ethers';
import { ethers } from 'hardhat';

const {
  utils: { formatBytes32String, hexlify }
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

  describe('construction', () => {
    it('should revert when initialized with an empty schema registry', async () => {
      await expect(Contracts.EAS.deploy(ZERO_ADDRESS, verifier.address)).to.be.revertedWith('InvalidRegistry');
    });

    it('should revert when initialized with an empty EIP712 verifier', async () => {
      await expect(Contracts.EAS.deploy(registry.address, ZERO_ADDRESS)).to.be.revertedWith('InvalidVerifier');
    });

    it('should be properly initialized', async () => {
      expect(await eas.VERSION()).to.equal('0.17');
      expect(await eas.getSchemaRegistry()).to.equal(registry.address);
      expect(await eas.getEIP712Verifier()).to.equal(verifier.address);
    });
  });

  interface Options {
    from?: Wallet;
    value?: BigNumberish;
    bump?: number;
  }

  enum SignatureType {
    Direct = 'direct',
    Delegated = 'delegated',
    Offchain = 'offchain'
  }

  describe('attesting', () => {
    let expirationTime: number;
    const data = '0x1234';

    beforeEach(async () => {
      expirationTime = (await eas.getTime()) + duration.days(30);
    });

    for (const signatureType of [SignatureType.Direct, SignatureType.Delegated, SignatureType.Offchain]) {
      context(`via ${signatureType} attestation`, () => {
        const expectAttestation = async (
          recipient: string,
          schema: string,
          expirationTime: number,
          revocable: boolean,
          refUUID: string,
          data: string,
          options?: Options
        ) => {
          const txSender = options?.from || sender;

          let uuid;

          switch (signatureType) {
            case SignatureType.Direct: {
              uuid = await getUUIDFromAttestTx(
                eas.connect(txSender).attest(recipient, schema, expirationTime, revocable, refUUID, data, {
                  value: options?.value
                })
              );

              break;
            }

            case SignatureType.Delegated: {
              const request = await eip712Utils.signDelegatedAttestation(
                txSender,
                recipient,
                schema,
                expirationTime,
                revocable,
                refUUID,
                data,
                await verifier.getNonce(txSender.address)
              );

              expect(await eip712Utils.verifyDelegatedAttestationSignature(txSender.address, request)).to.be.true;

              uuid = await getUUIDFromAttestTx(
                eas
                  .connect(txSender)
                  .attestByDelegation(
                    recipient,
                    schema,
                    expirationTime,
                    revocable,
                    refUUID,
                    data,
                    txSender.address,
                    request.v,
                    hexlify(request.r),
                    hexlify(request.s),
                    {
                      value: options?.value
                    }
                  )
              );

              break;
            }

            case SignatureType.Offchain: {
              const now = await latest();

              uuid = getOffchainUUID(schema, recipient, now, expirationTime, revocable, refUUID, data);

              const request = await eip712Utils.signOffchainAttestation(
                txSender,
                schema,
                recipient,
                now,
                expirationTime,
                revocable,
                refUUID,
                data
              );
              expect(await eip712Utils.verifyOffchainAttestation(txSender.address, request));

              expect(request.uuid).to.equal(uuid);

              return uuid;
            }
          }

          expect(await eas.isAttestationValid(uuid)).to.be.true;

          const attestation = await eas.getAttestation(uuid);
          expect(attestation.uuid).to.equal(uuid);
          expect(attestation.schema).to.equal(schema);
          expect(attestation.recipient).to.equal(recipient);
          expect(attestation.attester).to.equal(txSender.address);
          expect(attestation.time).to.equal(await eas.getTime());
          expect(attestation.expirationTime).to.equal(expirationTime);
          expect(attestation.revocationTime).to.equal(0);
          expect(attestation.revocable).to.equal(revocable);
          expect(attestation.refUUID).to.equal(refUUID);
          expect(attestation.data).to.equal(data);

          return uuid;
        };

        const expectFailedAttestation = async (
          recipient: string,
          schema: string,
          expirationTime: number,
          revocable: boolean,
          refUUID: string,
          data: any,
          err: string,
          options?: Options
        ) => {
          const txSender = options?.from || sender;

          switch (signatureType) {
            case SignatureType.Direct: {
              await expect(
                eas
                  .connect(txSender)
                  .attest(recipient, schema, expirationTime, revocable, refUUID, data, { value: options?.value })
              ).to.be.revertedWith(err);

              break;
            }

            case SignatureType.Delegated: {
              const request = await eip712Utils.signDelegatedAttestation(
                txSender,
                recipient,
                schema,
                expirationTime,
                revocable,
                refUUID,
                data,
                await verifier.getNonce(txSender.address)
              );

              expect(await eip712Utils.verifyDelegatedAttestationSignature(txSender.address, request)).to.be.true;

              await expect(
                eas
                  .connect(txSender)
                  .attestByDelegation(
                    recipient,
                    schema,
                    expirationTime,
                    revocable,
                    refUUID,
                    data,
                    txSender.address,
                    request.v,
                    hexlify(request.r),
                    hexlify(request.s),
                    { value: options?.value }
                  )
              ).to.be.revertedWith(err);

              break;
            }
          }
        };

        it('should revert when attesting to an unregistered schema', async () => {
          await expectFailedAttestation(
            recipient.address,
            formatBytes32String('BAD'),
            expirationTime,
            true,
            ZERO_BYTES32,
            data,
            'InvalidSchema'
          );
        });

        context('with registered schemas', () => {
          const schema1 = 'S1';
          const schema2 = 'S2';
          const schema3 = 'S3';
          const schema1Id = getSchemaUUID(schema1, ZERO_ADDRESS, true);
          const schema2Id = getSchemaUUID(schema2, ZERO_ADDRESS, true);
          const schema3Id = getSchemaUUID(schema3, ZERO_ADDRESS, true);

          beforeEach(async () => {
            await registry.register(schema1, ZERO_ADDRESS, true);
            await registry.register(schema2, ZERO_ADDRESS, true);
            await registry.register(schema3, ZERO_ADDRESS, true);
          });

          it('should revert when attesting with passed expiration time', async () => {
            const expired = (await eas.getTime()) - duration.days(1);
            await expectFailedAttestation(
              recipient.address,
              schema1Id,
              expired,
              true,
              ZERO_BYTES32,
              data,
              'InvalidExpirationTime'
            );
          });

          it('should allow attestation to an empty recipient', async () => {
            await expectAttestation(ZERO_ADDRESS, schema1Id, expirationTime, true, ZERO_BYTES32, data);
          });

          it('should allow self attestations', async () => {
            await expectAttestation(sender.address, schema2Id, expirationTime, true, ZERO_BYTES32, data, {
              from: sender
            });
          });

          it('should allow multiple attestations', async () => {
            await expectAttestation(recipient.address, schema1Id, expirationTime, true, ZERO_BYTES32, data);
            await expectAttestation(recipient2.address, schema1Id, expirationTime, true, ZERO_BYTES32, data);
          });

          it('should allow multiple attestations to the same schema', async () => {
            await expectAttestation(recipient.address, schema3Id, expirationTime, true, ZERO_BYTES32, data, {
              bump: 0
            });
            await expectAttestation(recipient.address, schema3Id, expirationTime, true, ZERO_BYTES32, data, {
              bump: 1
            });
            await expectAttestation(recipient.address, schema3Id, expirationTime, true, ZERO_BYTES32, data, {
              bump: 2
            });
          });

          it('should allow attestation without expiration time', async () => {
            await expectAttestation(recipient.address, schema1Id, 0, true, ZERO_BYTES32, data);
          });

          it('should allow attestation without any data', async () => {
            await expectAttestation(recipient.address, schema3Id, expirationTime, true, ZERO_BYTES32, ZERO_BYTES);
          });

          it('should store referenced attestation', async () => {
            const uuid = await eas.callStatic.attest(
              recipient.address,
              schema1Id,
              expirationTime,
              true,
              ZERO_BYTES32,
              data
            );
            await eas.attest(recipient.address, schema1Id, expirationTime, true, ZERO_BYTES32, data);

            await expectAttestation(recipient.address, schema3Id, expirationTime, true, uuid, data);
          });

          if (signatureType !== SignatureType.Offchain) {
            it('should generate unique UUIDs for similar attestations', async () => {
              const uuid1 = await expectAttestation(
                recipient.address,
                schema3Id,
                expirationTime,
                true,
                ZERO_BYTES32,
                data,
                {
                  bump: 0
                }
              );
              const uuid2 = await expectAttestation(
                recipient.address,
                schema3Id,
                expirationTime,
                true,
                ZERO_BYTES32,
                data,
                {
                  bump: 1
                }
              );
              const uuid3 = await expectAttestation(
                recipient.address,
                schema3Id,
                expirationTime,
                true,
                ZERO_BYTES32,
                data,
                {
                  bump: 2
                }
              );
              expect(uuid1).not.to.equal(uuid2);
              expect(uuid2).not.to.equal(uuid3);
            });
          }

          it('should revert when attesting to a non-existing attestation', async () => {
            await expectFailedAttestation(
              recipient.address,
              schema3Id,
              expirationTime,
              true,
              formatBytes32String('INVALID'),
              data,
              'NotFound'
            );
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
          true,
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

  describe('revocation', () => {
    const schema1 = 'S1';
    const schema1Id = getSchemaUUID(schema1, ZERO_ADDRESS, true);
    let uuid: string;

    let expirationTime: number;
    const data = '0x1234';

    beforeEach(async () => {
      await registry.register(schema1, ZERO_ADDRESS, true);

      expirationTime = (await eas.getTime()) + duration.days(30);
    });

    for (const signatureType of [SignatureType.Direct, SignatureType.Delegated]) {
      context(`via ${signatureType} attestation`, () => {
        const expectRevocation = async (uuid: string, options?: Options) => {
          const txSender = options?.from || sender;
          let res;

          switch (signatureType) {
            case SignatureType.Direct: {
              res = await eas.connect(txSender).revoke(uuid);

              break;
            }

            case SignatureType.Delegated: {
              const signature = await eip712Utils.signDelegatedRevocation(
                txSender,
                uuid,
                await verifier.getNonce(txSender.address)
              );

              res = await eas
                .connect(txSender)
                .revokeByDelegation(uuid, txSender.address, signature.v, hexlify(signature.r), hexlify(signature.s));

              break;
            }
          }

          await expect(res).to.emit(eas, 'Revoked').withArgs(recipient.address, txSender.address, uuid, schema1Id);

          const attestation = await eas.getAttestation(uuid);
          expect(attestation.revocationTime).to.equal(await eas.getTime());
        };

        const expectFailedRevocation = async (uuid: string, err: string, options?: Options) => {
          const txSender = options?.from || sender;

          switch (signatureType) {
            case SignatureType.Direct: {
              await expect(eas.connect(txSender).revoke(uuid)).to.be.revertedWith(err);

              break;
            }

            case SignatureType.Delegated: {
              const request = await eip712Utils.signDelegatedRevocation(
                txSender,
                uuid,
                await verifier.getNonce(txSender.address)
              );

              expect(await eip712Utils.verifyDelegatedRevocationSignature(txSender.address, request)).to.be.true;

              await expect(
                eas.revokeByDelegation(uuid, txSender.address, request.v, hexlify(request.r), hexlify(request.s))
              ).to.be.revertedWith(err);

              break;
            }
          }
        };

        beforeEach(async () => {
          uuid = await getUUIDFromAttestTx(
            eas.connect(sender).attest(recipient.address, schema1Id, expirationTime, true, ZERO_BYTES32, data)
          );
        });

        it('should revert when revoking a non-existing attestation', async () => {
          await expectFailedRevocation(formatBytes32String('BAD'), 'NotFound');
        });

        it("should revert when revoking a someone's else attestation", async () => {
          await expectFailedRevocation(uuid, 'AccessDenied', { from: sender2 });
        });

        it('should allow to revoke an existing attestation', async () => {
          await expectRevocation(uuid);
        });

        it('should revert when revoking an already revoked attestation', async () => {
          await expectRevocation(uuid);
          await expectFailedRevocation(uuid, 'AlreadyRevoked');
        });

        context('with an irrevocable attestation', () => {
          beforeEach(async () => {
            uuid = await getUUIDFromAttestTx(
              eas.connect(sender).attest(recipient.address, schema1Id, expirationTime, false, ZERO_BYTES32, data)
            );
          });

          it('should revert when revoking', async () => {
            await expectFailedRevocation(uuid, 'Irrevocable');
          });
        });

        context('with an irrevocable schema', () => {
          const schema2 = 'S2';
          const schema2Id = getSchemaUUID(schema2, ZERO_ADDRESS, false);

          beforeEach(async () => {
            await registry.register(schema2, ZERO_ADDRESS, false);

            uuid = await getUUIDFromAttestTx(
              eas.connect(sender).attest(recipient.address, schema2Id, expirationTime, true, ZERO_BYTES32, data)
            );
          });

          it('should revert when revoking', async () => {
            await expectFailedRevocation(uuid, 'Irrevocable');
          });
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
