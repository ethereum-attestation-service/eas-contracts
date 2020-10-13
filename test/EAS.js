const { expect } = require('chai');
const { BN, expectRevert, expectEvent, constants, time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS, ZERO_BYTES32, MAX_UINT256 } = constants;
const { duration, latest } = time;

const AORegistry = require('./helpers/aoRegistry');
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
  let eas;

  beforeEach(async () => {
    registry = await AORegistry.new();
    eas = await EAS.new(registry);
  });

  describe('construction', async () => {
    it('should report a version', async () => {
      expect(await eas.getVersion()).to.eql('0.1');
    });

    it('should initialize without any attestations categories or attestations', async () => {
      expect(await eas.getAttestationsCount()).to.be.bignumber.equal(new BN(0));
    });
  });

  describe('attesting', async () => {
    const testAttestation = async (recipient, ao, expirationTime, refUUID, data, options = {}) => {
      const attester = options.from || sender;

      const prevAttestationsCount = await eas.getAttestationsCount();
      const prevReceivedAttestationsUUIDsCount = await eas.getReceivedAttestationsUUIDsCount(recipient, ao);
      const prevSentAttestationsUUIDsCount = await eas.getSentAttestationsUUIDsCount(attester, ao);
      const prevRelatedAttestationsUUIDsCount = await eas.getRelatedAttestationsUUIDsCount(refUUID);

      const res = await eas.attest(recipient, ao, expirationTime, refUUID, data, options);
      const lastUUID = await eas.getLastUUID();

      expectEvent(res, EVENTS.attested, {
        _recipient: recipient,
        _attester: attester,
        _uuid: lastUUID,
        _ao: ao
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

      const receivedAttestationsUUIDsCount = await eas.getReceivedAttestationsUUIDsCount(recipient, ao);
      expect(receivedAttestationsUUIDsCount).to.be.bignumber.equal(prevReceivedAttestationsUUIDsCount.add(new BN(1)));
      const receivedAttestationsUUIDs = await eas.getReceivedAttestationsUUIDs(
        recipient,
        ao,
        0,
        receivedAttestationsUUIDsCount
      );
      expect(receivedAttestationsUUIDs).to.have.lengthOf(receivedAttestationsUUIDsCount);
      expect(receivedAttestationsUUIDs[receivedAttestationsUUIDs.length - 1]).to.eql(attestation.uuid);

      const sentAttestationsUUIDsCount = await eas.getSentAttestationsUUIDsCount(attester, ao);
      expect(sentAttestationsUUIDsCount).to.be.bignumber.equal(prevSentAttestationsUUIDsCount.add(new BN(1)));
      const sentAttestationsUUIDs = await eas.getSentAttestationsUUIDs(attester, ao, 0, sentAttestationsUUIDsCount);
      expect(sentAttestationsUUIDs).to.have.lengthOf(sentAttestationsUUIDsCount);
      expect(sentAttestationsUUIDs[sentAttestationsUUIDs.length - 1]).to.eql(attestation.uuid);

      if (refUUID != ZERO_BYTES32) {
        const relatedAttestationsUUIDsCount = await eas.getRelatedAttestationsUUIDsCount(refUUID);
        expect(relatedAttestationsUUIDsCount).to.be.bignumber.equal(prevRelatedAttestationsUUIDsCount.add(new BN(1)));

        const relatedAttestationsUUIDs = await eas.getRelatedAttestationsUUIDs(
          refUUID,
          0,
          relatedAttestationsUUIDsCount
        );
        expect(relatedAttestationsUUIDs).to.have.lengthOf(relatedAttestationsUUIDsCount);
        expect(relatedAttestationsUUIDs[relatedAttestationsUUIDs.length - 1]).to.eql(attestation.uuid);
      }

      return attestation.uuid;
    };

    const testFailedAttestation = async (recipient, ao, expirationTime, refUUID, data, err, options = {}) => {
      await expectRevert(eas.attest(recipient, ao, expirationTime, refUUID, data), err, options);
    };

    const sender = accounts[0];
    const recipient = accounts[1];
    const recipient2 = accounts[2];
    let expirationTime;
    const data = '0x1234';

    beforeEach(async () => {
      const now = await latest();
      expirationTime = now.add(duration.days(30));
    });

    it('should revert when attesting to an unregistered AO', async () => {
      await testFailedAttestation(recipient, new BN(10000), expirationTime, ZERO_BYTES32, data, 'ERR_INVALID_AO');
    });

    it('should revert when attesting to an invalid AO', async () => {
      await testFailedAttestation(recipient, new BN(0), expirationTime, ZERO_BYTES32, data, 'ERR_INVALID_AO');
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
        await testFailedAttestation(recipient, id1, expired, ZERO_BYTES32, data, 'ERR_INVALID_EXPIRATION_TIME');
      });

      it('should allow attestation to an empty recipient', async () => {
        await testAttestation(ZERO_ADDRESS, id1, expirationTime, ZERO_BYTES32, data);
      });

      it('should allow self attestations', async () => {
        await testAttestation(sender, id2, expirationTime, ZERO_BYTES32, data, { from: sender });
      });

      it('should allow multiple attestations', async () => {
        await testAttestation(recipient, id1, expirationTime, ZERO_BYTES32, data);
        await testAttestation(recipient2, id1, expirationTime, ZERO_BYTES32, data);
      });

      it('should allow multiple attestations to the same AO', async () => {
        await testAttestation(recipient, id3, expirationTime, ZERO_BYTES32, data);
        await testAttestation(recipient, id3, expirationTime, ZERO_BYTES32, data);
        await testAttestation(recipient, id3, expirationTime, ZERO_BYTES32, data);
      });

      it('should allow attestation without expiration time', async () => {
        await testAttestation(recipient, id1, MAX_UINT256, ZERO_BYTES32, data);
      });

      it('should allow attestation without any data', async () => {
        await testAttestation(recipient, id3, expirationTime, ZERO_BYTES32, ZERO_BYTES);
      });

      it('should store referenced attestation', async () => {
        await eas.attest(recipient, id1, expirationTime, ZERO_BYTES32, data);
        uuid = await eas.getLastUUID();

        await testAttestation(recipient, id3, expirationTime, uuid, data);
      });

      it('should revert when attesting to a non-existing attestation', async () => {
        await testFailedAttestation(recipient, id3, expirationTime, accounts[9], data, 'ERR_NO_ATTESTATION');
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
            'ERR_INVALID_ATTESTATION_DATA'
          );
        });

        it('should allow attesting to the correct recipient', async () => {
          await testAttestation(targetRecipient, vid4, expirationTime, ZERO_BYTES32, data);
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
            'ERR_INVALID_ATTESTATION_DATA'
          );
          await testFailedAttestation(
            recipient,
            vid4,
            expirationTime,
            ZERO_BYTES32,
            '0x02',
            'ERR_INVALID_ATTESTATION_DATA'
          );
        });

        it('should allow attesting with correct data', async () => {
          await testAttestation(recipient, vid4, expirationTime, ZERO_BYTES32, '0x00');
          await testAttestation(recipient, vid4, expirationTime, ZERO_BYTES32, '0x01');
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
            'ERR_INVALID_ATTESTATION_DATA'
          );
        });

        it('should allow attesting with the correct expiration time', async () => {
          await testAttestation(recipient, vid4, validAfter.add(duration.seconds(1)), ZERO_BYTES32, data);
        });
      });

      context('with msg.sender verifier', async () => {
        const targetSender = accounts[5];

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
            'ERR_INVALID_ATTESTATION_DATA',
            {
              from: sender
            }
          );
        });

        it('should allow attesting to the correct msg.sender', async () => {
          await testAttestation(recipient, vid4, expirationTime, ZERO_BYTES32, data, { from: targetSender });
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
            'ERR_INVALID_ATTESTATION_DATA'
          );
          await testFailedAttestation(
            recipient,
            vid4,
            expirationTime,
            ZERO_BYTES32,
            data,
            'ERR_INVALID_ATTESTATION_DATA',
            {
              value: targetValue.sub(new BN(1))
            }
          );
        });

        it('should allow attesting with correct msg.value', async () => {
          await testAttestation(recipient, vid4, expirationTime, ZERO_BYTES32, data, { value: targetValue });
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
            'ERR_INVALID_ATTESTATION_DATA'
          );
        });

        it('should allow attesting to an existing attestation', async () => {
          await testAttestation(recipient, vid4, expirationTime, ZERO_BYTES32, uuid);
        });
      });
    });
  });

  describe('revocation', async () => {
    const id1 = new BN(1);
    const sid1 = 'ID1';
    let uuid;

    const sender = accounts[0];
    const sender2 = accounts[2];
    const recipient = accounts[1];
    let expirationTime;
    const data = '0x1234';

    beforeEach(async () => {
      await registry.register(sid1, ZERO_ADDRESS);

      const now = await latest();
      expirationTime = now.add(duration.days(30));

      await eas.attest(recipient, id1, expirationTime, ZERO_BYTES32, data);
      uuid = await eas.getLastUUID();
    });

    it('should revert when revoking a non-existing attestation', async () => {
      await expectRevert(eas.revoke(accounts[8]), 'ERR_NO_ATTESTATION');
    });

    it("should revert when revoking a someone's else attestation", async () => {
      await expectRevert(eas.revoke(uuid, { from: sender2 }), 'ERR_ACCESS_DENIED');
    });

    it('should allow to revoke an existing attestation', async () => {
      const res = await eas.revoke(uuid);

      expectEvent(res, EVENTS.revoked, {
        _recipient: recipient,
        _attester: sender,
        _uuid: uuid,
        _ao: id1
      });

      const attestation = await eas.getAttestation(uuid);
      expect(attestation.revocationTime).to.be.bignumber.equal(await latest());
    });

    it('should revert when revoking an already revoked attestation', async () => {
      await eas.revoke(uuid);
      await expectRevert(eas.revoke(uuid), 'ERR_ALREADY_REVOKED');
    });
  });

  describe('pagination', async () => {
    const attestationsCount = 3000;

    let registry;
    let eas;

    const sender = accounts[0];
    const sender2 = accounts[1];
    const recipient = accounts[3];
    const recipient2 = accounts[4];
    let expirationTime;
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
      eas = await EAS.new(registry);

      await registry.register(sid1, ZERO_ADDRESS);
      await registry.register(sid2, ZERO_ADDRESS);

      await eas.attest(recipient2, id2, MAX_UINT256, ZERO_BYTES32, data, { from: sender2 });
      refUUID = await eas.getLastUUID();

      sentAttestations[sender] = [];
      receivedAttestations[recipient] = [];
      relatedAttestations[refUUID] = [];

      for (let i = 0; i < attestationsCount; ++i) {
        console.log(i);
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
      [0, 1000],
      [1, 2000],
      [1000, attestationsCount - 1000],
      [2000, attestationsCount - 2000],
      [2999, attestationsCount - 2999]
    ].forEach((slice) => {
      describe(`slice [${slice}]`, async () => {
        const [start, length] = slice;

        it('should return received attestations', async () => {
          expect(await eas.getReceivedAttestationsUUIDs(recipient, id1, start, length)).to.have.members(
            receivedAttestations[recipient].slice(start, start + length)
          );
        });

        it('should return sent attestations', async () => {
          expect(await eas.getSentAttestationsUUIDs(sender, id1, start, length)).to.have.members(
            sentAttestations[sender].slice(start, start + length)
          );
        });

        it('should return related attestations', async () => {
          expect(await eas.getRelatedAttestationsUUIDs(refUUID, start, length)).to.have.members(
            relatedAttestations[refUUID].slice(start, start + length)
          );
        });
      });
    });

    [
      [0, attestationsCount + 1],
      [attestationsCount + 1000, 1],
      [5000, attestationsCount - 5000 + 1],
      [attestationsCount + 10000000, 1]
    ].forEach((slice) => {
      describe(`slice [${slice}]`, async () => {
        const [start, length] = slice;

        it('should revert on received attestations', async () => {
          await expectRevert(eas.getReceivedAttestationsUUIDs(recipient, id1, start, length), 'ERR_INVALID_OFFSET');
        });

        it('should revert on sent attestations', async () => {
          await expectRevert(eas.getSentAttestationsUUIDs(sender, id1, start, length), 'ERR_INVALID_OFFSET');
        });

        it('should revert on related attestations', async () => {
          await expectRevert(eas.getRelatedAttestationsUUIDs(refUUID, start, length), 'ERR_INVALID_OFFSET');
        });
      });
    });
  });
});
