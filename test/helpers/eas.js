const { isEmpty } = require('lodash');
const { ecsign } = require('ethereumjs-util');
const { utils } = require('ethers');

const BaseContract = require('./baseContract');

const { hexlify } = utils;
const TestEASContract = artifacts.require('TestEAS');

class EAS extends BaseContract {
  constructor(aoRegistry, eip712Verifier) {
    super();

    this.aoRegistry = aoRegistry;
    this.eip712Verifier = eip712Verifier;
  }

  static async new(aoRegistry, eip712Verifier) {
    const eas = new EAS(aoRegistry, eip712Verifier);
    await eas.deploy();

    return eas;
  }

  async deploy() {
    this.contract = await TestEASContract.new(EAS.getAddress(this.aoRegistry), EAS.getAddress(this.eip712Verifier));
  }

  static getEvents() {
    return {
      attested: 'Attested',
      revoked: 'Revoked'
    };
  }

  async getVersion() {
    return this.contract.VERSION.call();
  }

  async getLastUUID() {
    return this.contract.lastUUID.call();
  }

  async getAttestationsCount() {
    return this.contract.attestationsCount.call();
  }

  async getAttestation(uuid) {
    const attestation = await this.contract.getAttestation.call(EAS.toBytes32(uuid));

    return {
      uuid: attestation[0],
      ao: attestation[1],
      to: attestation[2],
      from: attestation[3],
      time: attestation[4],
      expirationTime: attestation[5],
      revocationTime: attestation[6],
      refUUID: attestation[7],
      data: attestation[8]
    };
  }

  async getReceivedAttestationUUIDs(recipient, ao, start, length, reverseOrder = false) {
    return this.contract.getReceivedAttestationUUIDs.call(EAS.getAddress(recipient), ao, start, length, reverseOrder);
  }

  async getReceivedAttestationUUIDsCount(recipient, ao) {
    return this.contract.getReceivedAttestationUUIDsCount.call(EAS.getAddress(recipient), ao);
  }

  async getSentAttestationUUIDs(attester, ao, start, length, reverseOrder = false) {
    return this.contract.getSentAttestationUUIDs.call(EAS.getAddress(attester), ao, start, length, reverseOrder);
  }

  async getSentAttestationUUIDsCount(recipient, ao) {
    return this.contract.getSentAttestationUUIDsCount.call(EAS.getAddress(recipient), ao);
  }

  async getRelatedAttestationUUIDs(uuid, start, length, reverseOrder = false) {
    return this.contract.getRelatedAttestationUUIDs.call(EAS.toBytes32(uuid), start, length, reverseOrder);
  }

  async getRelatedAttestationUUIDsCount(recipient, ao) {
    return this.contract.getRelatedAttestationUUIDsCount.call(EAS.getAddress(recipient), ao);
  }

  async attest(recipient, ao, expirationTime, refUUID, data, options = {}) {
    let encodedData = data;
    if (typeof data === 'string' && !data.startsWith('0x')) {
      encodedData = web3.utils.asciiToHex(encodedData);
    }

    if (!isEmpty(options)) {
      return this.contract.testAttest(
        EAS.getAddress(recipient),
        ao,
        expirationTime,
        EAS.toBytes32(refUUID),
        encodedData,
        options
      );
    }

    return this.contract.testAttest(EAS.getAddress(recipient), ao, expirationTime, EAS.toBytes32(refUUID), encodedData);
  }

  async attestByProxy(recipient, ao, expirationTime, refUUID, data, attester, privateKey, options = {}) {
    let encodedData = data;
    if (typeof data === 'string' && !data.startsWith('0x')) {
      encodedData = hexlify(encodedData);
    }

    const nonce = await this.eip712Verifier.getNonce(attester);
    const digest = await this.eip712Verifier.getAttestDigest(
      EAS.getAddress(recipient),
      ao,
      expirationTime,
      EAS.toBytes32(refUUID),
      encodedData,
      nonce
    );

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(privateKey, 'hex'));

    if (!isEmpty(options)) {
      return this.contract.testAttestByProxy(
        EAS.getAddress(recipient),
        ao,
        expirationTime,
        EAS.toBytes32(refUUID),
        encodedData,
        EAS.getAddress(attester),
        v,
        hexlify(r),
        hexlify(s),
        options
      );
    }

    return this.contract.testAttestByProxy(
      EAS.getAddress(recipient),
      ao,
      expirationTime,
      EAS.toBytes32(refUUID),
      encodedData,
      EAS.getAddress(attester),
      v,
      hexlify(r),
      hexlify(s)
    );
  }

  async revoke(uuid, options = {}) {
    if (!isEmpty(options)) {
      return this.contract.revoke(EAS.toBytes32(uuid), options);
    }

    return this.contract.revoke(EAS.toBytes32(uuid));
  }

  async revokeByProxy(uuid, attester, privateKey, options = {}) {
    const nonce = await this.eip712Verifier.getNonce(attester);
    const digest = await this.eip712Verifier.getRevokeDigest(EAS.toBytes32(uuid), nonce);

    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(privateKey, 'hex'));

    if (!isEmpty(options)) {
      return this.contract.revokeByProxy(
        EAS.toBytes32(uuid),
        EAS.getAddress(attester),
        v,
        hexlify(r),
        hexlify(s),
        options
      );
    }

    return this.contract.revokeByProxy(EAS.toBytes32(uuid), EAS.getAddress(attester), v, hexlify(r), hexlify(s));
  }
}

module.exports = EAS;
