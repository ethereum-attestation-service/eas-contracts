const { expect } = require('chai');
const { BN, expectRevert, expectEvent, constants, time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS, ZERO_BYTES32, MAX_UINT256 } = constants;
const { duration, latest } = time;

const AORegistry = require('./helpers/aoRegistry');
const EIP712Verifier = require('./helpers/eip712Verifier');
const EAS = require('./helpers/eas');

const TestAORecipientVerifier = artifacts.require('TestAORecipientVerifier');
const TestAODataVerifier = artifacts.require('TestAODataVerifier');
const TestAOExpirationTimeVerifier = artifacts.require('TestAOExpirationTimeVerifier');
const TestAOAttesterVerifier = artifacts.require('TestAOAttesterVerifier');
const TestAOValueVerifier = artifacts.require('TestAOValueVerifier');
const TestAOAttestationVerifier = artifacts.require('TestAOAttestationVerifier');

contract('EAS', (accounts) => {
  const ZERO_BYTES = '0x00';
  const EVENTS = EAS.getEvents();

  let registry;
  let verifier;
  let eas;

  beforeEach(async () => {
    registry = await AORegistry.new();
    verifier = await EIP712Verifier.new();

    eas = await EAS.new(registry, verifier);
  });

  describe('construction', async () => {
    it('should report a version', async () => {
      expect(await eas.getVersion()).to.eql('0.2');
    });

    it('should initialize without any attestations categories or attestations', async () => {
      expect(await eas.getAttestationsCount()).to.be.bignumber.equal(new BN(0));
    });

    it('should revert when initialized with an empty AO registry', async () => {
      await expectRevert(EAS.new(ZERO_ADDRESS, verifier), 'ERR_INVALID_REGISTRY');
    });

    it('should revert when initialized with an empty EIP712 verifier', async () => {
      await expectRevert(EAS.new(registry, ZERO_ADDRESS), 'ERR_INVALID_EIP712_VERIFIER');
    });
  });

  describe('attesting', async () => {
    for (const proxy of [false, true]) {
      const sender = accounts[0];
      const attester = !proxy ? sender : accounts[5];
      const recipient = accounts[1];
      const recipient2 = accounts[2];
      let expirationTime;
      const data = '0x1234';

      beforeEach(async () => {
        const now = await latest();
        expirationTime = now.add(duration.days(30));
      });

      context(`${proxy ? 'via an EIP712 proxy' : 'directly'}`, async () => {
        const testAttestation = async (recipient, ao, expirationTime, refUUID, data, attester, options = {}) => {
          const prevAttestationsCount = await eas.getAttestationsCount();
          const prevReceivedAttestationsUUIDsCount = await eas.getReceivedAttestationUUIDsCount(recipient, ao);
          const prevSentAttestationsUUIDsCount = await eas.getSentAttestationUUIDsCount(attester, ao);
          const prevRelatedAttestationsUUIDsCount = await eas.getRelatedAttestationUUIDsCount(refUUID);

          let res;

          if (!proxy) {
            res = await eas.attest(recipient, ao, expirationTime, refUUID, data, options);
          } else {
            res = await eas.attestByProxy(recipient, ao, expirationTime, refUUID, data, attester, options);
          }

          const lastUUID = await eas.getLastUUID();

          expectEvent(res, EVENTS.attested, {
            recipient: recipient,
            attester: attester,
            uuid: lastUUID,
            ao: ao
          });

          expect(await eas.getAttestationsCount()).to.be.bignumber.equal(prevAttestationsCount.add(new BN(1)));

          const attestation = await eas.getAttestation(lastUUID);
          expect(attestation.uuid).to.eql(lastUUID);
          expect(attestation.ao).to.be.bignumber.equal(ao);
          expect(attestation.to).to.eql(recipient);
          expect(attestation.from).to.eql(attester);
          expect(attestation.time).to.be.bignumber.equal(await latest());
          expect(attestation.expirationTime).to.be.bignumber.equal(expirationTime);
          expect(attestation.revocationTime).to.be.bignumber.equal(new BN(0));
          expect(attestation.refUUID).to.eql(refUUID);
          expect(attestation.data).to.eql(data);

          const receivedAttestationsUUIDsCount = await eas.getReceivedAttestationUUIDsCount(recipient, ao);
          expect(receivedAttestationsUUIDsCount).to.be.bignumber.equal(
            prevReceivedAttestationsUUIDsCount.add(new BN(1))
          );
          const receivedAttestationsUUIDs = await eas.getReceivedAttestationUUIDs(
            recipient,
            ao,
            0,
            receivedAttestationsUUIDsCount
          );
          expect(receivedAttestationsUUIDs).to.have.lengthOf(receivedAttestationsUUIDsCount);
          expect(receivedAttestationsUUIDs[receivedAttestationsUUIDs.length - 1]).to.eql(attestation.uuid);

          const sentAttestationsUUIDsCount = await eas.getSentAttestationUUIDsCount(attester, ao);
          expect(sentAttestationsUUIDsCount).to.be.bignumber.equal(prevSentAttestationsUUIDsCount.add(new BN(1)));
          const sentAttestationsUUIDs = await eas.getSentAttestationUUIDs(attester, ao, 0, sentAttestationsUUIDsCount);
          expect(sentAttestationsUUIDs).to.have.lengthOf(sentAttestationsUUIDsCount);
          expect(sentAttestationsUUIDs[sentAttestationsUUIDs.length - 1]).to.eql(attestation.uuid);

          if (refUUID !== ZERO_BYTES32) {
            const relatedAttestationsUUIDsCount = await eas.getRelatedAttestationUUIDsCount(refUUID);
            expect(relatedAttestationsUUIDsCount).to.be.bignumber.equal(
              prevRelatedAttestationsUUIDsCount.add(new BN(1))
            );

            const relatedAttestationsUUIDs = await eas.getRelatedAttestationUUIDs(
              refUUID,
              0,
              relatedAttestationsUUIDsCount
            );
            expect(relatedAttestationsUUIDs).to.have.lengthOf(relatedAttestationsUUIDsCount);
            expect(relatedAttestationsUUIDs[relatedAttestationsUUIDs.length - 1]).to.eql(attestation.uuid);
          }

          return attestation.uuid;
        };

        const testFailedAttestation = async (
          recipient,
          ao,
          expirationTime,
          refUUID,
          data,
          attester,
          err,
          options = {}
        ) => {
          if (!proxy) {
            await expectRevert(eas.attest(recipient, ao, expirationTime, refUUID, data), err, options);
          } else {
            await expectRevert(eas.attestByProxy(recipient, ao, expirationTime, refUUID, data, attester), err, options);
          }
        };

        it('should revert when attesting to an unregistered AO', async () => {
          await testFailedAttestation(
            recipient,
            new BN(10000),
            expirationTime,
            ZERO_BYTES32,
            data,
            attester,
            'ERR_INVALID_AO'
          );
        });

        it('should revert when attesting to an invalid AO', async () => {
          await testFailedAttestation(
            recipient,
            new BN(0),
            expirationTime,
            ZERO_BYTES32,
            data,
            attester,
            'ERR_INVALID_AO'
          );
        });

        context('with registered AOs', async () => {
          const id1 = new BN(1);
          const id2 = new BN(2);
          const id3 = new BN(3);
          const sid1 = 'ID1';
          const sid2 = 'ID2';
          const sid3 = 'ID3';
          const vid4 = new BN(4);
          const svid4 = 'VID4';

          beforeEach(async () => {
            await registry.register(sid1, ZERO_ADDRESS);
            await registry.register(sid2, ZERO_ADDRESS);
            await registry.register(sid3, ZERO_ADDRESS);
          });

          it('should revert when attesting with passed expiration time', async () => {
            const expired = (await latest()).sub(duration.days(1));
            await testFailedAttestation(
              recipient,
              id1,
              expired,
              ZERO_BYTES32,
              data,
              sender,
              'ERR_INVALID_EXPIRATION_TIME'
            );
          });

          it('should allow attestation to an empty recipient', async () => {
            await testAttestation(ZERO_ADDRESS, id1, expirationTime, ZERO_BYTES32, data, attester);
          });

          it('should allow self attestations', async () => {
            await testAttestation(attester, id2, expirationTime, ZERO_BYTES32, data, attester, { from: sender });
          });

          it('should allow multiple attestations', async () => {
            await testAttestation(recipient, id1, expirationTime, ZERO_BYTES32, data, attester);
            await testAttestation(recipient2, id1, expirationTime, ZERO_BYTES32, data, attester);
          });

          it('should allow multiple attestations to the same AO', async () => {
            await testAttestation(recipient, id3, expirationTime, ZERO_BYTES32, data, attester);
            await testAttestation(recipient, id3, expirationTime, ZERO_BYTES32, data, attester);
            await testAttestation(recipient, id3, expirationTime, ZERO_BYTES32, data, attester);
          });

          it('should allow attestation without expiration time', async () => {
            await testAttestation(recipient, id1, MAX_UINT256, ZERO_BYTES32, data, attester);
          });

          it('should allow attestation without any data', async () => {
            await testAttestation(recipient, id3, expirationTime, ZERO_BYTES32, ZERO_BYTES, attester);
          });

          it('should store referenced attestation', async () => {
            await eas.attest(recipient, id1, expirationTime, ZERO_BYTES32, data);
            const uuid = await eas.getLastUUID();

            await testAttestation(recipient, id3, expirationTime, uuid, data, attester);
          });

          it('should revert when attesting to a non-existing attestation', async () => {
            await testFailedAttestation(
              recipient,
              id3,
              expirationTime,
              accounts[9],
              data,
              attester,
              'ERR_NO_ATTESTATION'
            );
          });

          context('with recipient verifier', async () => {
            const targetRecipient = accounts[5];

            beforeEach(async () => {
              const verifier = await TestAORecipientVerifier.new(targetRecipient);

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting to a wrong recipient', async () => {
              await testFailedAttestation(
                recipient,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                data,
                attester,
                'ERR_INVALID_ATTESTATION_DATA'
              );
            });

            it('should allow attesting to the correct recipient', async () => {
              await testAttestation(targetRecipient, vid4, expirationTime, ZERO_BYTES32, data, attester);
            });
          });

          context('with data verifier', async () => {
            beforeEach(async () => {
              const verifier = await TestAODataVerifier.new();

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting with wrong data', async () => {
              await testFailedAttestation(
                recipient,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                '0x1234',
                attester,
                'ERR_INVALID_ATTESTATION_DATA'
              );
              await testFailedAttestation(
                recipient,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                '0x02',
                attester,
                'ERR_INVALID_ATTESTATION_DATA'
              );
            });

            it('should allow attesting with correct data', async () => {
              await testAttestation(recipient, vid4, expirationTime, ZERO_BYTES32, '0x00', attester);
              await testAttestation(recipient, vid4, expirationTime, ZERO_BYTES32, '0x01', attester);
            });
          });

          context('with expiration time verifier', async () => {
            let validAfter;

            beforeEach(async () => {
              validAfter = (await latest()).add(duration.years(1));
              const verifier = await TestAOExpirationTimeVerifier.new(validAfter);

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting with a wrong expiration time', async () => {
              await testFailedAttestation(
                recipient,
                vid4,
                validAfter.sub(duration.days(1)),
                ZERO_BYTES32,
                data,
                attester,
                'ERR_INVALID_ATTESTATION_DATA'
              );
            });

            it('should allow attesting with the correct expiration time', async () => {
              await testAttestation(recipient, vid4, validAfter.add(duration.seconds(1)), ZERO_BYTES32, data, attester);
            });
          });

          context('with msg.sender verifier', async () => {
            const targetSender = accounts[8];

            beforeEach(async () => {
              const verifier = await TestAOAttesterVerifier.new(targetSender);

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting to the wrong msg.sender', async () => {
              await testFailedAttestation(
                recipient,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                data,
                attester,
                'ERR_INVALID_ATTESTATION_DATA',
                {
                  from: sender
                }
              );
            });

            it('should allow attesting to the correct msg.sender', async () => {
              await testAttestation(recipient, vid4, expirationTime, ZERO_BYTES32, data, targetSender, {
                from: targetSender
              });
            });
          });

          context('with msg.value verifier', async () => {
            const targetValue = new BN(7862432);

            beforeEach(async () => {
              const verifier = await TestAOValueVerifier.new(targetValue);

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting with wrong msg.value', async () => {
              await testFailedAttestation(
                recipient,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                data,
                attester,
                'ERR_INVALID_ATTESTATION_DATA'
              );
              await testFailedAttestation(
                recipient,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                data,
                attester,
                'ERR_INVALID_ATTESTATION_DATA',
                {
                  value: targetValue.sub(new BN(1))
                }
              );
            });

            it('should allow attesting with correct msg.value', async () => {
              await testAttestation(recipient, vid4, expirationTime, ZERO_BYTES32, data, attester, {
                value: targetValue
              });
            });
          });

          context('with attestation verifier', async () => {
            let uuid;

            beforeEach(async () => {
              await eas.attest(recipient, id1, expirationTime, ZERO_BYTES32, data);
              uuid = await eas.getLastUUID();

              const verifier = await TestAOAttestationVerifier.new(eas.getAddress());

              await registry.register(svid4, verifier.address);
            });

            it('should revert when attesting to a non-existing attestation', async () => {
              await testFailedAttestation(
                recipient,
                vid4,
                expirationTime,
                ZERO_BYTES32,
                ZERO_BYTES32,
                attester,
                'ERR_INVALID_ATTESTATION_DATA'
              );
            });

            it('should allow attesting to an existing attestation', async () => {
              await testAttestation(recipient, vid4, expirationTime, ZERO_BYTES32, uuid, attester);
            });
          });
        });
      });
    }
  });

  describe('revocation', async () => {
    for (const proxy of [false, true]) {
      const id1 = new BN(1);
      const sid1 = 'ID1';
      let uuid;

      const recipient = accounts[1];
      const sender = accounts[0];
      const attester = !proxy ? sender : accounts[5];
      const sender2 = accounts[2];

      let expirationTime;
      const data = '0x1234';

      const testRevocation = async (uuid, attester, options = {}) => {
        let res;

        if (!proxy) {
          res = await eas.revoke(uuid, options);
        } else {
          res = await eas.revokeByProxy(uuid, attester, options);
        }

        expectEvent(res, EVENTS.revoked, {
          recipient: recipient,
          attester,
          uuid: uuid,
          ao: id1
        });

        const attestation = await eas.getAttestation(uuid);
        expect(attestation.revocationTime).to.be.bignumber.equal(await latest());
      };

      const testFailedRevocation = async (uuid, attester, err, options = {}) => {
        if (!proxy) {
          await expectRevert(eas.revoke(uuid, options), err);
        } else {
          await expectRevert(eas.revokeByProxy(uuid, attester, options), err);
        }
      };

      context(`${proxy ? 'via an EIP712 proxy' : 'directly'}`, async () => {
        beforeEach(async () => {
          await registry.register(sid1, ZERO_ADDRESS);

          const now = await latest();
          expirationTime = now.add(duration.days(30));

          await eas.attest(recipient, id1, expirationTime, ZERO_BYTES32, data, { from: attester });
          uuid = await eas.getLastUUID();
        });

        it('should revert when revoking a non-existing attestation', async () => {
          await testFailedRevocation(accounts[8], attester, 'ERR_NO_ATTESTATION');
        });

        it("should revert when revoking a someone's else attestation", async () => {
          await testFailedRevocation(uuid, sender2, 'ERR_ACCESS_DENIED', { from: sender2 });
        });

        it('should allow to revoke an existing attestation', async () => {
          await testRevocation(uuid, attester);
        });

        it('should revert when revoking an already revoked attestation', async () => {
          await testRevocation(uuid, attester);
          await testFailedRevocation(uuid, attester, 'ERR_ALREADY_REVOKED');
        });
      });
    }
  });

  describe('pagination', async () => {
    const attestationsCount = 100;

    let registry;
    let verifier;
    let eas;

    const sender = accounts[0];
    const sender2 = accounts[1];
    const recipient = accounts[3];
    const recipient2 = accounts[4];
    const data = '0x1234';
    let refUUID;

    const sentAttestations = {};
    const receivedAttestations = {};
    const relatedAttestations = {};

    const id1 = new BN(1);
    const id2 = new BN(2);
    const sid1 = 'ID1';
    const sid2 = 'ID2';

    before(async () => {
      registry = await AORegistry.new();
      verifier = await EIP712Verifier.new();

      eas = await EAS.new(registry, verifier);

      await registry.register(sid1, ZERO_ADDRESS);
      await registry.register(sid2, ZERO_ADDRESS);

      await eas.attest(recipient2, id2, MAX_UINT256, ZERO_BYTES32, data, { from: sender2 });
      refUUID = await eas.getLastUUID();

      sentAttestations[sender] = [];
      receivedAttestations[recipient] = [];
      relatedAttestations[refUUID] = [];

      for (let i = 0; i < attestationsCount; ++i) {
        await eas.attest(recipient, id1, MAX_UINT256, refUUID, data, { from: sender });

        const uuid = await eas.getLastUUID();
        sentAttestations[sender].push(uuid);
        receivedAttestations[recipient].push(uuid);
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
          expect(await eas.getReceivedAttestationUUIDs(recipient, id2, start, length)).to.be.empty();
          expect(await eas.getReceivedAttestationUUIDs(recipient, id2, start, length, true)).to.be.empty();
        });

        it('should return an empty array of sent attestations', async () => {
          expect(await eas.getSentAttestationUUIDs(sender, id2, start, length)).to.be.empty();
          expect(await eas.getSentAttestationUUIDs(sender, id2, start, length, true)).to.be.empty();
        });

        it('should return an empty array of related attestations', async () => {
          expect(await eas.getRelatedAttestationUUIDs(ZERO_BYTES32, start, length)).to.be.empty();
          expect(await eas.getRelatedAttestationUUIDs(ZERO_BYTES32, start, length, true)).to.be.empty();
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
          expect(await eas.getReceivedAttestationUUIDs(recipient, id1, start, length)).to.have.members(
            receivedAttestations[recipient].slice(start, start + length)
          );
          expect(await eas.getReceivedAttestationUUIDs(recipient, id1, start, length, true)).to.have.members(
            receivedAttestations[recipient]
              .slice()
              .reverse()
              .slice(start, start + length)
          );
        });

        it('should return sent attestations', async () => {
          expect(await eas.getSentAttestationUUIDs(sender, id1, start, length)).to.have.members(
            sentAttestations[sender].slice(start, start + length)
          );
          expect(await eas.getSentAttestationUUIDs(sender, id1, start, length, true)).to.have.members(
            sentAttestations[sender]
              .slice()
              .reverse()
              .slice(start, start + length)
          );
        });

        it('should return related attestations', async () => {
          expect(await eas.getRelatedAttestationUUIDs(refUUID, start, length)).to.have.members(
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
          await expectRevert(eas.getReceivedAttestationUUIDs(recipient, id1, start, length), 'ERR_INVALID_OFFSET');
          await expectRevert(
            eas.getReceivedAttestationUUIDs(recipient, id1, start, length, true),
            'ERR_INVALID_OFFSET'
          );
        });

        it('should revert on sent attestations', async () => {
          await expectRevert(eas.getSentAttestationUUIDs(sender, id1, start, length), 'ERR_INVALID_OFFSET');
          await expectRevert(eas.getSentAttestationUUIDs(sender, id1, start, length, true), 'ERR_INVALID_OFFSET');
        });

        it('should revert on related attestations', async () => {
          await expectRevert(eas.getRelatedAttestationUUIDs(refUUID, start, length), 'ERR_INVALID_OFFSET');
          await expectRevert(eas.getRelatedAttestationUUIDs(refUUID, start, length, true), 'ERR_INVALID_OFFSET');
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
          expect(await eas.getReceivedAttestationUUIDs(recipient, id1, start, length)).to.have.members(
            receivedAttestations[recipient].slice(start, attestationsCount)
          );
          expect(await eas.getReceivedAttestationUUIDs(recipient, id1, start, length, true)).to.have.members(
            receivedAttestations[recipient].slice().reverse().slice(start, attestationsCount)
          );
        });

        it('should trim the length of the  sent attestations', async () => {
          expect(await eas.getSentAttestationUUIDs(sender, id1, start, length)).to.have.members(
            sentAttestations[sender].slice(start, attestationsCount)
          );
          expect(await eas.getSentAttestationUUIDs(sender, id1, start, length, true)).to.have.members(
            sentAttestations[sender].slice().reverse().slice(start, attestationsCount)
          );
        });

        it('should trim the length of the  related attestations', async () => {
          expect(await eas.getRelatedAttestationUUIDs(refUUID, start, length)).to.have.members(
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
