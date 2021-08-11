import Contracts from '../components/Contracts';
import {
  ASRegistry,
  EIP712Verifier,
  TestASPayingResolver,
  TestASTokenResolver,
  TestEAS,
  TestERC20Token
} from '../typechain';
import * as testAccounts from './accounts.json';
import { EIP712Utils } from './helpers/EIP712Utils';
import { duration, latest } from './helpers/Time';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

const {
  provider: { getBalance }
} = ethers;

const {
  constants: { AddressZero, MaxUint256 },
  utils: { formatBytes32String, hexlify, solidityKeccak256 }
} = ethers;

const ZERO_BYTES = '0x';
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

describe('EAS', () => {
  let accounts: SignerWithAddress[];
  let sender: SignerWithAddress;
  let sender2: SignerWithAddress;
  let recipient: SignerWithAddress;
  let recipient2: SignerWithAddress;

  let registry: ASRegistry;
  let verifier: EIP712Verifier;
  let eas: TestEAS;
  let eip712Utils: EIP712Utils;
  let token: TestERC20Token;

  before(async () => {
    accounts = await ethers.getSigners();

    [sender, sender2, recipient, recipient2] = accounts;
  });

  beforeEach(async () => {
    registry = await Contracts.ASRegistry.deploy();
    verifier = await Contracts.EIP712Verifier.deploy();
    eip712Utils = new EIP712Utils(verifier.address);

    eas = await Contracts.TestEAS.deploy(registry.address, verifier.address);
  });

  describe('construction', async () => {
    it('should report a version', async () => {
      expect(await eas.VERSION()).to.equal('0.6');
    });

    it('should initialize without any attestations categories or attestations', async () => {
      expect(await eas.getAttestationsCount()).to.equal(BigNumber.from(0));
    });

    it('should revert when initialized with an empty AS registry', async () => {
      await expect(Contracts.EAS.deploy(AddressZero, verifier.address)).to.be.revertedWith('ERR_INVALID_REGISTRY');
    });

    it('should revert when initialized with an empty EIP712 verifier', async () => {
      await expect(Contracts.EAS.deploy(registry.address, AddressZero)).to.be.revertedWith(
        'ERR_INVALID_EIP712_VERIFIER'
      );
    });
  });

  interface Options {
    from?: SignerWithAddress;
    value?: BigNumber;
  }

  const getASUUID = (schema: string, resolver: string) => solidityKeccak256(['bytes', 'address'], [schema, resolver]);

  describe('attesting', async () => {
    let expirationTime: BigNumber;
    const data = '0x1234';

    beforeEach(async () => {
      const now = await latest();
      expirationTime = now.add(duration.days(30));
    });

    for (const delegation of [false, true]) {
      context(`${delegation ? 'via an EIP712 delegation' : 'directly'}`, async () => {
        const testAttestation = async (
          recipient: string,
          schema: string,
          expirationTime: BigNumber,
          refUUID: string,
          data: any,
          options?: Options
        ) => {
          const txSender = options?.from || sender;

          const prevAttestationsCount = await eas.getAttestationsCount();
          const prevReceivedAttestationsUUIDsCount = await eas.getReceivedAttestationUUIDsCount(recipient, schema);
          const prevSentAttestationsUUIDsCount = await eas.getSentAttestationUUIDsCount(txSender.address, schema);
          const prevSchemaAttestationsUUIDsCount = await eas.getSchemaAttestationUUIDsCount(schema);
          const prevRelatedAttestationsUUIDsCount = await eas.getRelatedAttestationUUIDsCount(refUUID);

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
              (testAccounts.privateKeys as any)[txSender.address.toLowerCase()]
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

          const lastUUID = await eas.getLastUUID();

          await expect(res).to.emit(eas, 'Attested').withArgs(recipient, txSender.address, lastUUID, schema);

          expect(await eas.getAttestationsCount()).to.equal(prevAttestationsCount.add(BigNumber.from(1)));

          const attestation = await eas.getAttestation(lastUUID);
          expect(attestation.uuid).to.equal(lastUUID);
          expect(attestation.schema).to.equal(schema);
          expect(attestation.recipient).to.equal(recipient);
          expect(attestation.attester).to.equal(txSender.address);
          expect(attestation.time).to.equal(await latest());
          expect(attestation.expirationTime).to.equal(expirationTime);
          expect(attestation.revocationTime).to.equal(BigNumber.from(0));
          expect(attestation.refUUID).to.equal(refUUID);
          expect(attestation.data).to.equal(data);

          const receivedAttestationsUUIDsCount = await eas.getReceivedAttestationUUIDsCount(recipient, schema);
          expect(receivedAttestationsUUIDsCount).to.equal(prevReceivedAttestationsUUIDsCount.add(BigNumber.from(1)));
          const receivedAttestationsUUIDs = await eas.getReceivedAttestationUUIDs(
            recipient,
            schema,
            0,
            receivedAttestationsUUIDsCount,
            false
          );
          expect(receivedAttestationsUUIDs).to.have.lengthOf(receivedAttestationsUUIDsCount.toNumber());
          expect(receivedAttestationsUUIDs[receivedAttestationsUUIDs.length - 1]).to.equal(attestation.uuid);

          const sentAttestationsUUIDsCount = await eas.getSentAttestationUUIDsCount(txSender.address, schema);
          expect(sentAttestationsUUIDsCount).to.equal(prevSentAttestationsUUIDsCount.add(BigNumber.from(1)));
          const sentAttestationsUUIDs = await eas.getSentAttestationUUIDs(
            txSender.address,
            schema,
            0,
            sentAttestationsUUIDsCount,
            false
          );
          expect(sentAttestationsUUIDs).to.have.lengthOf(sentAttestationsUUIDsCount.toNumber());
          expect(sentAttestationsUUIDs[sentAttestationsUUIDs.length - 1]).to.equal(attestation.uuid);

          const schemaAttestationsUUIDsCount = await eas.getSchemaAttestationUUIDsCount(schema);
          expect(schemaAttestationsUUIDsCount).to.equal(prevSchemaAttestationsUUIDsCount.add(BigNumber.from(1)));
          const schemaAttestationsUUIDs = await eas.getSchemaAttestationUUIDs(
            schema,
            0,
            schemaAttestationsUUIDsCount,
            false
          );
          expect(schemaAttestationsUUIDs).to.have.lengthOf(schemaAttestationsUUIDsCount.toNumber());
          expect(schemaAttestationsUUIDs[schemaAttestationsUUIDs.length - 1]).to.equal(attestation.uuid);

          if (refUUID !== ZERO_BYTES32) {
            const relatedAttestationsUUIDsCount = await eas.getRelatedAttestationUUIDsCount(refUUID);
            expect(relatedAttestationsUUIDsCount).to.equal(prevRelatedAttestationsUUIDsCount.add(BigNumber.from(1)));

            const relatedAttestationsUUIDs = await eas.getRelatedAttestationUUIDs(
              refUUID,
              0,
              relatedAttestationsUUIDsCount,
              false
            );
            expect(relatedAttestationsUUIDs).to.have.lengthOf(relatedAttestationsUUIDsCount.toNumber());
            expect(relatedAttestationsUUIDs[relatedAttestationsUUIDs.length - 1]).to.equal(attestation.uuid);
          }
        };

        const testFailedAttestation = async (
          recipient: string,
          as: string,
          expirationTime: BigNumber,
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
              (testAccounts.privateKeys as any)[txSender.address.toLowerCase()]
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
            'ERR_INVALID_AS'
          );
        });

        context('with registered schemas', async () => {
          const schema1 = formatBytes32String('AS1');
          const schema2 = formatBytes32String('AS2');
          const schema3 = formatBytes32String('AS3');
          const schema1Id = getASUUID(schema1, AddressZero);
          const schema2Id = getASUUID(schema2, AddressZero);
          const schema3Id = getASUUID(schema3, AddressZero);

          beforeEach(async () => {
            await registry.register(schema1, AddressZero);
            await registry.register(schema2, AddressZero);
            await registry.register(schema3, AddressZero);
          });

          it('should revert when attesting with passed expiration time', async () => {
            const expired = (await latest()).sub(duration.days(1));
            await testFailedAttestation(
              recipient.address,
              schema1Id,
              expired,
              ZERO_BYTES32,
              data,
              'ERR_INVALID_EXPIRATION_TIME'
            );
          });

          it('should allow attestation to an empty recipient', async () => {
            await testAttestation(AddressZero, schema1Id, expirationTime, ZERO_BYTES32, data);
          });

          it('should allow self attestations', async () => {
            await testAttestation(sender.address, schema2Id, expirationTime, ZERO_BYTES32, data, { from: sender });
          });

          it('should allow multiple attestations', async () => {
            await testAttestation(recipient.address, schema1Id, expirationTime, ZERO_BYTES32, data);
            await testAttestation(recipient2.address, schema1Id, expirationTime, ZERO_BYTES32, data);
          });

          it('should allow multiple attestations to the same schema', async () => {
            await testAttestation(recipient.address, schema3Id, expirationTime, ZERO_BYTES32, data);
            await testAttestation(recipient.address, schema3Id, expirationTime, ZERO_BYTES32, data);
            await testAttestation(recipient.address, schema3Id, expirationTime, ZERO_BYTES32, data);
          });

          it('should allow attestation without expiration time', async () => {
            await testAttestation(recipient.address, schema1Id, MaxUint256, ZERO_BYTES32, data);
          });

          it('should allow attestation without any data', async () => {
            await testAttestation(recipient.address, schema3Id, expirationTime, ZERO_BYTES32, ZERO_BYTES);
          });

          it('should store referenced attestation', async () => {
            await eas.attest(recipient.address, schema1Id, expirationTime, ZERO_BYTES32, data);
            const uuid = await eas.getLastUUID();

            await testAttestation(recipient.address, schema3Id, expirationTime, uuid, data);
          });

          it('should revert when attesting to a non-existing attestation', async () => {
            await testFailedAttestation(
              recipient.address,
              schema3Id,
              expirationTime,
              formatBytes32String('INVALID'),
              data,
              'ERR_NO_ATTESTATION'
            );
          });

          it('should revert when sending ETH to a non-payable resolver', async () => {
            const schema4 = formatBytes32String('AS4');
            let schema4Id: string;
            const targetRecipient = accounts[5];

            const resolver = await Contracts.TestASRecipientResolver.deploy(targetRecipient.address);
            expect(await resolver.isPayable()).to.be.false;
            await expect(sender.sendTransaction({ to: resolver.address, value: BigNumber.from(1) })).to.be.revertedWith(
              'ERR_NOT_PAYABLE'
            );

            await registry.register(schema4, resolver.address);
            schema4Id = getASUUID(schema4, resolver.address);

            await testFailedAttestation(
              recipient.address,
              schema4Id,
              expirationTime,
              ZERO_BYTES32,
              data,
              'ERR_ETH_TRANSFER_UNSUPPORTED',
              { value: BigNumber.from(1) }
            );
          });

          context('with recipient resolver', async () => {
            const schema4 = formatBytes32String('AS4');
            let schema4Id: string;
            let targetRecipient: SignerWithAddress;

            beforeEach(async () => {
              targetRecipient = accounts[5];

              const resolver = await Contracts.TestASRecipientResolver.deploy(targetRecipient.address);
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getASUUID(schema4, resolver.address);
            });

            it('should revert when attesting to a wrong recipient', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'ERR_INVALID_ATTESTATION_DATA'
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
              const resolver = await Contracts.TestASDataResolver.deploy();
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getASUUID(schema4, resolver.address);
            });

            it('should revert when attesting with wrong data', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                '0x1234',
                'ERR_INVALID_ATTESTATION_DATA'
              );

              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                '0x02',
                'ERR_INVALID_ATTESTATION_DATA'
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
            let validAfter: BigNumber;

            beforeEach(async () => {
              validAfter = (await latest()).add(duration.years(1));
              const resolver = await Contracts.TestASExpirationTimeResolver.deploy(validAfter);
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getASUUID(schema4, resolver.address);
            });

            it('should revert when attesting with a wrong expiration time', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                validAfter.sub(duration.days(1)),
                ZERO_BYTES32,
                data,
                'ERR_INVALID_ATTESTATION_DATA'
              );
            });

            it('should allow attesting with the correct expiration time', async () => {
              await testAttestation(
                recipient.address,
                schema4Id,
                validAfter.add(duration.seconds(1)),
                ZERO_BYTES32,
                data
              );
            });
          });

          context('with msg.sender resolver', async () => {
            const schema4 = formatBytes32String('schema4Id');
            let schema4Id: string;
            let targetSender: SignerWithAddress;

            beforeEach(async () => {
              targetSender = accounts[8];

              const resolver = await Contracts.TestASAttesterResolver.deploy(targetSender.address);
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getASUUID(schema4, resolver.address);
            });

            it('should revert when attesting to the wrong msg.sender', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'ERR_INVALID_ATTESTATION_DATA',
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
            const targetValue = BigNumber.from(7862432);

            beforeEach(async () => {
              const resolver = await Contracts.TestASValueResolver.deploy(targetValue);
              expect(await resolver.isPayable()).to.be.true;

              await registry.register(schema4, resolver.address);
              schema4Id = getASUUID(schema4, resolver.address);
            });

            it('should revert when attesting with wrong msg.value', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'ERR_INVALID_ATTESTATION_DATA'
              );
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'ERR_INVALID_ATTESTATION_DATA',
                {
                  value: targetValue.sub(BigNumber.from(1))
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
            const targetAmount = BigNumber.from(22334);
            let resolver: TestASTokenResolver;

            beforeEach(async () => {
              token = await Contracts.TestERC20Token.deploy('TKN', 'TKN', BigNumber.from(9999999999));

              resolver = await Contracts.TestASTokenResolver.deploy(token.address, targetAmount);
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getASUUID(schema4, resolver.address);
            });

            it('should revert when attesting with wrong token amount', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'ERC20: transfer amount exceeds allowance'
              );

              await token.approve(resolver.address, targetAmount.sub(BigNumber.from(1)));
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                data,
                'ERC20: transfer amount exceeds allowance'
              );
            });

            it('should allow attesting with correct token amount', async () => {
              await token.approve(resolver.address, targetAmount);
              await testAttestation(recipient.address, schema4Id, expirationTime, ZERO_BYTES32, data);
            });
          });

          context('with attestation resolver', async () => {
            const schema4 = formatBytes32String('schema4Id');
            let schema4Id: string;
            let uuid: string;

            beforeEach(async () => {
              await eas.attest(recipient.address, schema1Id, expirationTime, ZERO_BYTES32, data);
              uuid = await eas.getLastUUID();

              const resolver = await Contracts.TestASAttestationResolver.deploy(eas.address);
              expect(await resolver.isPayable()).to.be.false;

              await registry.register(schema4, resolver.address);
              schema4Id = getASUUID(schema4, resolver.address);
            });

            it('should revert when attesting to a non-existing attestation', async () => {
              await testFailedAttestation(
                recipient.address,
                schema4Id,
                expirationTime,
                ZERO_BYTES32,
                ZERO_BYTES32,
                'ERR_INVALID_ATTESTATION_DATA'
              );
            });

            it('should allow attesting to an existing attestation', async () => {
              await testAttestation(recipient.address, schema4Id, expirationTime, ZERO_BYTES32, uuid);
            });
          });

          context('with paying resolver', async () => {
            const schema4 = formatBytes32String('schema4Id');
            let schema4Id: string;
            const incentive = BigNumber.from(1000);
            let resolver: TestASPayingResolver;

            beforeEach(async () => {
              resolver = await Contracts.TestASPayingResolver.deploy(incentive);
              expect(await resolver.isPayable()).to.be.true;

              await sender.sendTransaction({ to: resolver.address, value: incentive.mul(BigNumber.from(2)) });

              await registry.register(schema4, resolver.address);
              schema4Id = getASUUID(schema4, resolver.address);
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
      ).to.be.revertedWith('ERR_INVALID_SIGNATURE');
    });
  });

  describe('revocation', async () => {
    const schema1 = formatBytes32String('AS1');
    const schema1Id = getASUUID(schema1, AddressZero);
    let uuid: string;

    let expirationTime: BigNumber;
    const data = '0x1234';

    beforeEach(async () => {
      await registry.register(schema1, AddressZero);

      const now = await latest();
      expirationTime = now.add(duration.days(30));
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
            (testAccounts.privateKeys as any)[txSender.address.toLowerCase()]
          );

          res = await eas
            .connect(txSender)
            .revokeByDelegation(uuid, txSender.address, request.v, hexlify(request.r), hexlify(request.s));
        }

        await expect(res).to.emit(eas, 'Revoked').withArgs(recipient.address, txSender.address, uuid, schema1Id);

        const attestation = await eas.getAttestation(uuid);
        expect(attestation.revocationTime).to.equal(await latest());
      };

      const testFailedRevocation = async (uuid: string, err: string, options?: Options) => {
        const txSender = options?.from || sender;

        if (!delegation) {
          await expect(eas.connect(txSender).revoke(uuid)).to.be.revertedWith(err);
        } else {
          const request = await eip712Utils.getRevocationRequest(
            uuid,
            await verifier.getNonce(txSender.address),
            (testAccounts.privateKeys as any)[txSender.address.toLowerCase()]
          );

          await expect(
            eas.revokeByDelegation(uuid, txSender.address, request.v, hexlify(request.r), hexlify(request.s))
          ).to.be.revertedWith(err);
        }
      };

      context(`${delegation ? 'via an EIP712 delegation' : 'directly'}`, async () => {
        beforeEach(async () => {
          await eas.attest(recipient.address, schema1Id, expirationTime, ZERO_BYTES32, data);
          uuid = await eas.getLastUUID();
        });

        it('should revert when revoking a non-existing attestation', async () => {
          await testFailedRevocation(formatBytes32String('BAD'), 'ERR_NO_ATTESTATION');
        });

        it("should revert when revoking a someone's else attestation", async () => {
          await testFailedRevocation(uuid, 'ERR_ACCESS_DENIED', { from: sender2 });
        });

        it('should allow to revoke an existing attestation', async () => {
          await testRevocation(uuid);
        });

        it('should revert when revoking an already revoked attestation', async () => {
          await testRevocation(uuid);
          await testFailedRevocation(uuid, 'ERR_ALREADY_REVOKED');
        });
      });
    }

    it('should revert when delegation revoking with a wrong signature', async () => {
      await expect(
        eas.revokeByDelegation(ZERO_BYTES32, sender.address, 28, formatBytes32String('BAD'), formatBytes32String('BAD'))
      ).to.be.revertedWith('ERR_INVALID_SIGNATURE');
    });
  });

  describe('pagination', async () => {
    const attestationsCount = 100;

    let registry;
    let verifier;
    let eas: TestEAS;

    const data = '0x1234';
    let refUUID: string;

    const sentAttestations: { [key: string]: string[] } = {};
    const receivedAttestations: { [key: string]: string[] } = {};
    const schemaAttestations: { [key: string]: string[] } = {};
    const relatedAttestations: { [key: string]: string[] } = {};

    const schema1 = formatBytes32String('AS1');
    const schema2 = formatBytes32String('AS2');
    const schema3 = formatBytes32String('AS3');
    const schema1Id = getASUUID(schema1, AddressZero);
    const schema2Id = getASUUID(schema2, AddressZero);
    const schema3Id = getASUUID(schema3, AddressZero);

    before(async () => {
      registry = await Contracts.ASRegistry.deploy();
      verifier = await Contracts.EIP712Verifier.deploy();

      eas = await Contracts.TestEAS.deploy(registry.address, verifier.address);

      await registry.register(schema1, AddressZero);
      await registry.register(schema2, AddressZero);
      await registry.register(schema3, AddressZero);

      await eas.connect(sender2).attest(recipient2.address, schema2Id, MaxUint256, ZERO_BYTES32, data);
      refUUID = await eas.getLastUUID();

      sentAttestations[sender.address] = [];
      receivedAttestations[recipient.address] = [];
      schemaAttestations[schema1Id] = [];
      relatedAttestations[refUUID] = [];

      for (let i = 0; i < attestationsCount; ++i) {
        await eas.connect(sender).attest(recipient.address, schema1Id, MaxUint256, refUUID, data);

        const uuid = await eas.getLastUUID();
        sentAttestations[sender.address].push(uuid);
        receivedAttestations[recipient.address].push(uuid);
        schemaAttestations[schema1Id].push(uuid);
        relatedAttestations[refUUID].push(uuid);
      }
    });

    [
      [0, attestationsCount],
      [0, 1],
      [10, 1],
      [0, 50],
      [1, 90],
      [80, attestationsCount - 20],
      [95, attestationsCount - 5],
      [99, attestationsCount - 1]
    ].forEach((slice) => {
      describe(`slice [${slice}]`, async () => {
        const [start, length] = slice;

        it('should return an empty array of received attestations', async () => {
          expect(await eas.getReceivedAttestationUUIDs(recipient.address, schema2Id, start, length, false)).to.be.empty;
          expect(await eas.getReceivedAttestationUUIDs(recipient.address, schema2Id, start, length, true)).to.be.empty;
        });

        it('should return an empty array of sent attestations', async () => {
          expect(await eas.getSentAttestationUUIDs(sender.address, schema2Id, start, length, false)).to.be.empty;
          expect(await eas.getSentAttestationUUIDs(sender.address, schema2Id, start, length, true)).to.be.empty;
        });

        it('should return an empty array of schema attestations', async () => {
          expect(await eas.getSchemaAttestationUUIDs(schema3Id, start, length, false)).to.be.empty;
          expect(await eas.getSchemaAttestationUUIDs(schema3Id, start, length, true)).to.be.empty;
        });

        it('should return an empty array of related attestations', async () => {
          expect(await eas.getRelatedAttestationUUIDs(ZERO_BYTES32, start, length, false)).to.be.empty;
          expect(await eas.getRelatedAttestationUUIDs(ZERO_BYTES32, start, length, true)).to.be.empty;
        });
      });
    });

    [
      [0, attestationsCount],
      [0, 1],
      [10, 1],
      [0, 50],
      [1, 90],
      [80, attestationsCount - 20],
      [95, attestationsCount - 5],
      [99, attestationsCount - 1]
    ].forEach((slice) => {
      describe(`slice [${slice}]`, async () => {
        const [start, length] = slice;

        it('should return received attestations', async () => {
          expect(
            await eas.getReceivedAttestationUUIDs(recipient.address, schema1Id, start, length, false)
          ).to.have.members(receivedAttestations[recipient.address].slice(start, start + length));
          expect(
            await eas.getReceivedAttestationUUIDs(recipient.address, schema1Id, start, length, true)
          ).to.have.members(
            receivedAttestations[recipient.address]
              .slice()
              .reverse()
              .slice(start, start + length)
          );
        });

        it('should return sent attestations', async () => {
          expect(await eas.getSentAttestationUUIDs(sender.address, schema1Id, start, length, false)).to.have.members(
            sentAttestations[sender.address].slice(start, start + length)
          );
          expect(await eas.getSentAttestationUUIDs(sender.address, schema1Id, start, length, true)).to.have.members(
            sentAttestations[sender.address]
              .slice()
              .reverse()
              .slice(start, start + length)
          );
        });

        it('should return schema attestations', async () => {
          expect(await eas.getSchemaAttestationUUIDs(schema1Id, start, length, false)).to.have.members(
            schemaAttestations[schema1Id].slice(start, start + length)
          );
          expect(await eas.getSchemaAttestationUUIDs(schema1Id, start, length, true)).to.have.members(
            schemaAttestations[schema1Id]
              .slice()
              .reverse()
              .slice(start, start + length)
          );
        });

        it('should return related attestations', async () => {
          expect(await eas.getRelatedAttestationUUIDs(refUUID, start, length, false)).to.have.members(
            relatedAttestations[refUUID].slice(start, start + length)
          );
          expect(await eas.getRelatedAttestationUUIDs(refUUID, start, length, true)).to.have.members(
            relatedAttestations[refUUID]
              .slice()
              .reverse()
              .slice(start, start + length)
          );
        });
      });
    });

    [
      [attestationsCount + 1000, 1],
      [attestationsCount + 10000000, 100],
      [attestationsCount + 1, 1]
    ].forEach((slice) => {
      describe(`slice [${slice}]`, async () => {
        const [start, length] = slice;

        it('should revert on received attestations', async () => {
          await expect(
            eas.getReceivedAttestationUUIDs(recipient.address, schema1Id, start, length, false)
          ).to.be.revertedWith('ERR_INVALID_OFFSET');
          await expect(
            eas.getReceivedAttestationUUIDs(recipient.address, schema1Id, start, length, true)
          ).to.be.revertedWith('ERR_INVALID_OFFSET');
        });

        it('should revert on sent attestations', async () => {
          await expect(eas.getSentAttestationUUIDs(sender.address, schema1Id, start, length, false)).to.be.revertedWith(
            'ERR_INVALID_OFFSET'
          );
          await expect(eas.getSentAttestationUUIDs(sender.address, schema1Id, start, length, true)).to.be.revertedWith(
            'ERR_INVALID_OFFSET'
          );
        });

        it('should revert on schema attestations', async () => {
          await expect(eas.getSchemaAttestationUUIDs(schema1Id, start, length, false)).to.be.revertedWith(
            'ERR_INVALID_OFFSET'
          );
          await expect(eas.getSchemaAttestationUUIDs(schema1Id, start, length, true)).to.be.revertedWith(
            'ERR_INVALID_OFFSET'
          );
        });

        it('should revert on related attestations', async () => {
          await expect(eas.getRelatedAttestationUUIDs(refUUID, start, length, false)).to.be.revertedWith(
            'ERR_INVALID_OFFSET'
          );
          await expect(eas.getRelatedAttestationUUIDs(refUUID, start, length, true)).to.be.revertedWith(
            'ERR_INVALID_OFFSET'
          );
        });
      });
    });

    [
      [0, attestationsCount + 1],
      [20, attestationsCount - 20 + 1],
      [80, attestationsCount - 80 + 1000],
      [attestationsCount - 1, 10000]
    ].forEach((slice) => {
      describe(`slice [${slice}]`, async () => {
        const [start, length] = slice;

        it('should trim the length of the received attestations', async () => {
          expect(
            await eas.getReceivedAttestationUUIDs(recipient.address, schema1Id, start, length, false)
          ).to.have.members(receivedAttestations[recipient.address].slice(start, attestationsCount));
          expect(
            await eas.getReceivedAttestationUUIDs(recipient.address, schema1Id, start, length, true)
          ).to.have.members(receivedAttestations[recipient.address].slice().reverse().slice(start, attestationsCount));
        });

        it('should trim the length of the  sent attestations', async () => {
          expect(await eas.getSentAttestationUUIDs(sender.address, schema1Id, start, length, false)).to.have.members(
            sentAttestations[sender.address].slice(start, attestationsCount)
          );
          expect(await eas.getSentAttestationUUIDs(sender.address, schema1Id, start, length, true)).to.have.members(
            sentAttestations[sender.address].slice().reverse().slice(start, attestationsCount)
          );
        });

        it('should trim the length of the  sent attestations', async () => {
          expect(await eas.getSchemaAttestationUUIDs(schema1Id, start, length, false)).to.have.members(
            schemaAttestations[schema1Id].slice(start, attestationsCount)
          );
          expect(await eas.getSchemaAttestationUUIDs(schema1Id, start, length, true)).to.have.members(
            schemaAttestations[schema1Id].slice().reverse().slice(start, attestationsCount)
          );
        });

        it('should trim the length of the  related attestations', async () => {
          expect(await eas.getRelatedAttestationUUIDs(refUUID, start, length, false)).to.have.members(
            relatedAttestations[refUUID].slice(start, attestationsCount)
          );
          expect(await eas.getRelatedAttestationUUIDs(refUUID, start, length, true)).to.have.members(
            relatedAttestations[refUUID].slice().reverse().slice(start, attestationsCount)
          );
        });
      });
    });
  });
});
