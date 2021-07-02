import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import Contracts from 'components/Contracts';
import { AORegistry, EIP712Verifier, TestEAS } from 'typechain';

import { latest, duration } from 'test/helpers/Time';
import { EIP712Verifier as EIP712VerifierHelper } from 'test/helpers/EIP712Verifier';

import * as testAccounts from 'test/accounts.json';

const {
  constants: { AddressZero, MaxUint256 },
  utils: { formatBytes32String, hexlify }
} = ethers;

const ZERO_BYTES = '0x00';
const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

let accounts: SignerWithAddress[];
let sender: SignerWithAddress;
let sender2: SignerWithAddress;
let recipient: SignerWithAddress;
let recipient2: SignerWithAddress;

let registry: AORegistry;
let verifier: EIP712Verifier;
let eas: TestEAS;
let verifierHelper: EIP712VerifierHelper;

describe('EAS', () => {
  const getAttestation = async (lastUUID: string) => {
    const data = await eas.getAttestation(lastUUID);

    return {
      uuid: data[0],
      ao: data[1],
      to: data[2],
      from: data[3],
      time: data[4],
      expirationTime: data[5],
      revocationTime: data[6],
      refUUID: data[7],
      data: data[8]
    };
  };

  before(async () => {
    accounts = await ethers.getSigners();

    [sender, sender2, recipient, recipient2] = accounts;
  });

  beforeEach(async () => {
    registry = await Contracts.AORegistry.deploy();
    verifier = await Contracts.EIP712Verifier.deploy();
    verifierHelper = new EIP712VerifierHelper(verifier.address);

    eas = await Contracts.TestEAS.deploy(registry.address, verifier.address);
  });

  describe('construction', async () => {
    it('should report a version', async () => {
      expect(await eas.VERSION()).to.equal('0.2');
    });

    it('should initialize without any attestations categories or attestations', async () => {
      expect(await eas.getAttestationsCount()).to.equal(BigNumber.from(0));
    });

    it('should revert when initialized with an empty AO registry', async () => {
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
          ao: BigNumber,
          expirationTime: BigNumber,
          refUUID: string,
          data: any,
          options?: Options
        ) => {
          const txSender = options?.from || sender;

          const prevAttestationsCount = await eas.getAttestationsCount();
          const prevReceivedAttestationsUUIDsCount = await eas.getReceivedAttestationUUIDsCount(recipient, ao);
          const prevSentAttestationsUUIDsCount = await eas.getSentAttestationUUIDsCount(txSender.address, ao);
          const prevRelatedAttestationsUUIDsCount = await eas.getRelatedAttestationUUIDsCount(refUUID);

          let res;

          if (!delegation) {
            res = await eas
              .connect(txSender)
              .attest(recipient, ao, expirationTime, refUUID, data, { value: options?.value });
          } else {
            const request = await verifierHelper.getAttestationRequest(
              recipient,
              ao,
              expirationTime,
              refUUID,
              data,
              await verifier.getNonce(txSender.address),
              (<any>testAccounts.privateKeys)[txSender.address.toLowerCase()]
            );

            res = await eas
              .connect(txSender)
              .attestByDelegation(
                recipient,
                ao,
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

          await expect(res).to.emit(eas, 'Attested').withArgs(recipient, txSender.address, lastUUID, ao);

          expect(await eas.getAttestationsCount()).to.equal(prevAttestationsCount.add(BigNumber.from(1)));

          const attestation = await getAttestation(lastUUID);
          expect(attestation.uuid).to.equal(lastUUID);
          expect(attestation.ao).to.equal(ao);
          expect(attestation.to).to.equal(recipient);
          expect(attestation.from).to.equal(txSender.address);
          expect(attestation.time).to.equal(await latest());
          expect(attestation.expirationTime).to.equal(expirationTime);
          expect(attestation.revocationTime).to.equal(BigNumber.from(0));
          expect(attestation.refUUID).to.equal(refUUID);
          expect(attestation.data).to.equal(data);

          const receivedAttestationsUUIDsCount = await eas.getReceivedAttestationUUIDsCount(recipient, ao);
          expect(receivedAttestationsUUIDsCount).to.equal(prevReceivedAttestationsUUIDsCount.add(BigNumber.from(1)));
          const receivedAttestationsUUIDs = await eas.getReceivedAttestationUUIDs(
            recipient,
            ao,
            0,
            receivedAttestationsUUIDsCount,
            false
          );
          expect(receivedAttestationsUUIDs).to.have.lengthOf(receivedAttestationsUUIDsCount.toNumber());
          expect(receivedAttestationsUUIDs[receivedAttestationsUUIDs.length - 1]).to.equal(attestation.uuid);

          const sentAttestationsUUIDsCount = await eas.getSentAttestationUUIDsCount(txSender.address, ao);
          expect(sentAttestationsUUIDsCount).to.equal(prevSentAttestationsUUIDsCount.add(BigNumber.from(1)));
          const sentAttestationsUUIDs = await eas.getSentAttestationUUIDs(
            txSender.address,
            ao,
            0,
            sentAttestationsUUIDsCount,
            false
          );
          expect(sentAttestationsUUIDs).to.have.lengthOf(sentAttestationsUUIDsCount.toNumber());
          expect(sentAttestationsUUIDs[sentAttestationsUUIDs.length - 1]).to.equal(attestation.uuid);

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

          return attestation.uuid;
        };

        const testFailedAttestation = async (
          recipient: string,
          ao: BigNumber,
          expirationTime: BigNumber,
          refUUID: string,
          data: any,
          err: string,
          options?: Options
        ) => {
          const txSender = options?.from || sender;

          if (!delegation) {
            await expect(eas.connect(txSender).attest(recipient, ao, expirationTime, refUUID, data)).to.be.revertedWith(
              err
            );
          } else {
            const request = await verifierHelper.getAttestationRequest(
              recipient,
              ao,
              expirationTime,
              refUUID,
              data,
              await verifier.getNonce(txSender.address),
              (<any>testAccounts.privateKeys)[txSender.address.toLowerCase()]
            );

            await expect(
              eas
                .connect(txSender)
                .attestByDelegation(
                  recipient,
                  ao,
                  expirationTime,
                  refUUID,
                  data,
                  txSender.address,
                  request.v,
                  hexlify(request.r),
                  hexlify(request.s)
                )
            ).to.be.revertedWith(err);
          }
        };

        it('should revert when attesting to an unregistered AO', async () => {
          await testFailedAttestation(
            recipient.address,
            BigNumber.from(10000),
            expirationTime,
            ZERO_BYTES32,
            data,
            'ERR_INVALID_AO'
          );
        });

        it('should revert when attesting to an invalid AO', async () => {
          await testFailedAttestation(
            recipient.address,
            BigNumber.from(0),
            expirationTime,
            ZERO_BYTES32,
            data,
            'ERR_INVALID_AO'
          );
        });

        context('with registered AOs', async () => {
          const id1 = BigNumber.from(1);
          const id2 = BigNumber.from(2);
          const id3 = BigNumber.from(3);
          const sid1 = formatBytes32String('ID1');
          const sid2 = formatBytes32String('ID2');
          const sid3 = formatBytes32String('ID3');
          const vid4 = BigNumber.from(4);
          const svid4 = formatBytes32String('VID4');

          beforeEach(async () => {
            await registry.register(sid1, AddressZero);
            await registry.register(sid2, AddressZero);
            await registry.register(sid3, AddressZero);
          });

          it('should revert when attesting with passed expiration time', async () => {
            const expired = (await latest()).sub(duration.days(1));
            await testFailedAttestation(
              recipient.address,
              id1,
              expired,
              ZERO_BYTES32,
              data,
              'ERR_INVALID_EXPIRATION_TIME'
            );
          });

          it('should allow attestation to an empty recipient', async () => {
            await testAttestation(AddressZero, id1, expirationTime, ZERO_BYTES32, data);
          });

          it('should allow self attestations', async () => {
            await testAttestation(sender.address, id2, expirationTime, ZERO_BYTES32, data, { from: sender });
          });

          it('should allow multiple attestations', async () => {
            await testAttestation(recipient.address, id1, expirationTime, ZERO_BYTES32, data);
            await testAttestation(recipient2.address, id1, expirationTime, ZERO_BYTES32, data);
          });

          it('should allow multiple attestations to the same AO', async () => {
            await testAttestation(recipient.address, id3, expirationTime, ZERO_BYTES32, data);
            await testAttestation(recipient.address, id3, expirationTime, ZERO_BYTES32, data);
            await testAttestation(recipient.address, id3, expirationTime, ZERO_BYTES32, data);
          });

          it('should allow attestation without expiration time', async () => {
            await testAttestation(recipient.address, id1, MaxUint256, ZERO_BYTES32, data);
          });

          it('should allow attestation without any data', async () => {
            await testAttestation(recipient.address, id3, expirationTime, ZERO_BYTES32, ZERO_BYTES);
          });

          it('should store referenced attestation', async () => {
            await eas.attest(recipient.address, id1, expirationTime, ZERO_BYTES32, data);
            const uuid = await eas.getLastUUID();

            await testAttestation(recipient.address, id3, expirationTime, uuid, data);
          });

          it('should revert when attesting to a non-existing attestation', async () => {
            await testFailedAttestation(
              recipient.address,
              id3,
              expirationTime,
              formatBytes32String('INVALID'),
              data,
              'ERR_NO_ATTESTATION'
            );
          });

          context('with recipient verifier', async () => {
            let targetRecipient: SignerWithAddress;

            beforeEach(async () => {
              targetRecipient = accounts[5];

              const verifier = await Contracts.TestAORecipientVerifier.deploy(targetRecipient.address);

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting to a wrong recipient', async () => {
              await testFailedAttestation(
                recipient.address,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                data,
                'ERR_INVALID_ATTESTATION_DATA'
              );
            });

            it('should allow attesting to the correct recipient', async () => {
              await testAttestation(targetRecipient.address, vid4, expirationTime, ZERO_BYTES32, data);
            });
          });

          context('with data verifier', async () => {
            beforeEach(async () => {
              const verifier = await Contracts.TestAODataVerifier.deploy();

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting with wrong data', async () => {
              await testFailedAttestation(
                recipient.address,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                '0x1234',
                'ERR_INVALID_ATTESTATION_DATA'
              );

              await testFailedAttestation(
                recipient.address,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                '0x02',
                'ERR_INVALID_ATTESTATION_DATA'
              );
            });

            it('should allow attesting with correct data', async () => {
              await testAttestation(recipient.address, vid4, expirationTime, ZERO_BYTES32, '0x00');
              await testAttestation(recipient.address, vid4, expirationTime, ZERO_BYTES32, '0x01');
            });
          });

          context('with expiration time verifier', async () => {
            let validAfter: BigNumber;

            beforeEach(async () => {
              validAfter = (await latest()).add(duration.years(1));
              const verifier = await Contracts.TestAOExpirationTimeVerifier.deploy(validAfter);

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting with a wrong expiration time', async () => {
              await testFailedAttestation(
                recipient.address,
                vid4,
                validAfter.sub(duration.days(1)),
                ZERO_BYTES32,
                data,
                'ERR_INVALID_ATTESTATION_DATA'
              );
            });

            it('should allow attesting with the correct expiration time', async () => {
              await testAttestation(recipient.address, vid4, validAfter.add(duration.seconds(1)), ZERO_BYTES32, data);
            });
          });

          context('with msg.sender verifier', async () => {
            let targetSender: SignerWithAddress;

            beforeEach(async () => {
              targetSender = accounts[8];

              const verifier = await Contracts.TestAOAttesterVerifier.deploy(targetSender.address);

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting to the wrong msg.sender', async () => {
              await testFailedAttestation(
                recipient.address,
                vid4,
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
              await testAttestation(recipient.address, vid4, expirationTime, ZERO_BYTES32, data, {
                from: targetSender
              });
            });
          });

          context('with msg.value verifier', async () => {
            const targetValue = BigNumber.from(7862432);

            beforeEach(async () => {
              const verifier = await Contracts.TestAOValueVerifier.deploy(targetValue);

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting with wrong msg.value', async () => {
              await testFailedAttestation(
                recipient.address,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                data,
                'ERR_INVALID_ATTESTATION_DATA'
              );
              await testFailedAttestation(
                recipient.address,
                vid4,
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
              await testAttestation(recipient.address, vid4, expirationTime, ZERO_BYTES32, data, {
                value: targetValue
              });
            });
          });

          context('with attestation verifier', async () => {
            let uuid: string;

            beforeEach(async () => {
              await eas.attest(recipient.address, id1, expirationTime, ZERO_BYTES32, data);
              uuid = await eas.getLastUUID();

              const verifier = await Contracts.TestAOAttestationVerifier.deploy(eas.address);

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting to a non-existing attestation', async () => {
              await testFailedAttestation(
                recipient.address,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                ZERO_BYTES32,
                'ERR_INVALID_ATTESTATION_DATA'
              );
            });

            it('should allow attesting to an existing attestation', async () => {
              await testAttestation(recipient.address, vid4, expirationTime, ZERO_BYTES32, uuid);
            });
          });
        });
      });
    }

    it('should revert when delegation attesting with a wrong signature', async () => {
      await expect(
        eas.attestByDelegation(
          recipient.address,
          BigNumber.from(10),
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
    const id1 = BigNumber.from(1);
    const sid1 = formatBytes32String('ID1');
    let uuid: string;

    let expirationTime: BigNumber;
    const data = '0x1234';

    beforeEach(async () => {
      await registry.register(sid1, AddressZero);

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
          const request = await verifierHelper.getRevocationRequest(
            uuid,
            await verifier.getNonce(txSender.address),
            (<any>testAccounts.privateKeys)[txSender.address.toLowerCase()]
          );

          res = await eas
            .connect(txSender)
            .revokeByDelegation(uuid, txSender.address, request.v, hexlify(request.r), hexlify(request.s));
        }

        await expect(res).to.emit(eas, 'Revoked').withArgs(recipient.address, txSender.address, uuid, id1);

        const attestation = await getAttestation(uuid);
        expect(attestation.revocationTime).to.equal(await latest());
      };

      const testFailedRevocation = async (uuid: string, err: string, options?: Options) => {
        const txSender = options?.from || sender;

        if (!delegation) {
          await expect(eas.connect(txSender).revoke(uuid)).to.be.revertedWith(err);
        } else {
          const request = await verifierHelper.getRevocationRequest(
            uuid,
            await verifier.getNonce(txSender.address),
            (<any>testAccounts.privateKeys)[txSender.address.toLowerCase()]
          );

          await expect(
            eas.revokeByDelegation(uuid, txSender.address, request.v, hexlify(request.r), hexlify(request.s))
          ).to.be.revertedWith(err);
        }
      };

      context(`${delegation ? 'via an EIP712 delegation' : 'directly'}`, async () => {
        beforeEach(async () => {
          await eas.attest(recipient.address, id1, expirationTime, ZERO_BYTES32, data);
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
    const relatedAttestations: { [key: string]: string[] } = {};

    const id1 = BigNumber.from(1);
    const id2 = BigNumber.from(2);
    const sid1 = formatBytes32String('ID1');
    const sid2 = formatBytes32String('ID2');

    before(async () => {
      registry = await Contracts.AORegistry.deploy();
      verifier = await Contracts.EIP712Verifier.deploy();

      eas = await Contracts.TestEAS.deploy(registry.address, verifier.address);

      await registry.register(sid1, AddressZero);
      await registry.register(sid2, AddressZero);

      await eas.connect(sender2).attest(recipient2.address, id2, MaxUint256, ZERO_BYTES32, data);
      refUUID = await eas.getLastUUID();

      sentAttestations[sender.address] = [];
      receivedAttestations[recipient.address] = [];
      relatedAttestations[refUUID] = [];

      for (let i = 0; i < attestationsCount; ++i) {
        await eas.connect(sender).attest(recipient.address, id1, MaxUint256, refUUID, data);

        const uuid = await eas.getLastUUID();
        sentAttestations[sender.address].push(uuid);
        receivedAttestations[recipient.address].push(uuid);
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
          expect(await eas.getReceivedAttestationUUIDs(recipient.address, id2, start, length, false)).to.be.empty;
          expect(await eas.getReceivedAttestationUUIDs(recipient.address, id2, start, length, true)).to.be.empty;
        });

        it('should return an empty array of sent attestations', async () => {
          expect(await eas.getSentAttestationUUIDs(sender.address, id2, start, length, false)).to.be.empty;
          expect(await eas.getSentAttestationUUIDs(sender.address, id2, start, length, true)).to.be.empty;
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
          expect(await eas.getReceivedAttestationUUIDs(recipient.address, id1, start, length, false)).to.have.members(
            receivedAttestations[recipient.address].slice(start, start + length)
          );
          expect(await eas.getReceivedAttestationUUIDs(recipient.address, id1, start, length, true)).to.have.members(
            receivedAttestations[recipient.address]
              .slice()
              .reverse()
              .slice(start, start + length)
          );
        });

        it('should return sent attestations', async () => {
          expect(await eas.getSentAttestationUUIDs(sender.address, id1, start, length, false)).to.have.members(
            sentAttestations[sender.address].slice(start, start + length)
          );
          expect(await eas.getSentAttestationUUIDs(sender.address, id1, start, length, true)).to.have.members(
            sentAttestations[sender.address]
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
            eas.getReceivedAttestationUUIDs(recipient.address, id1, start, length, false)
          ).to.be.revertedWith('ERR_INVALID_OFFSET');
          await expect(eas.getReceivedAttestationUUIDs(recipient.address, id1, start, length, true)).to.be.revertedWith(
            'ERR_INVALID_OFFSET'
          );
        });

        it('should revert on sent attestations', async () => {
          await expect(eas.getSentAttestationUUIDs(sender.address, id1, start, length, false)).to.be.revertedWith(
            'ERR_INVALID_OFFSET'
          );
          await expect(eas.getSentAttestationUUIDs(sender.address, id1, start, length, true)).to.be.revertedWith(
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
          expect(await eas.getReceivedAttestationUUIDs(recipient.address, id1, start, length, false)).to.have.members(
            receivedAttestations[recipient.address].slice(start, attestationsCount)
          );
          expect(await eas.getReceivedAttestationUUIDs(recipient.address, id1, start, length, true)).to.have.members(
            receivedAttestations[recipient.address].slice().reverse().slice(start, attestationsCount)
          );
        });

        it('should trim the length of the  sent attestations', async () => {
          expect(await eas.getSentAttestationUUIDs(sender.address, id1, start, length, false)).to.have.members(
            sentAttestations[sender.address].slice(start, attestationsCount)
          );
          expect(await eas.getSentAttestationUUIDs(sender.address, id1, start, length, true)).to.have.members(
            sentAttestations[sender.address].slice().reverse().slice(start, attestationsCount)
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
