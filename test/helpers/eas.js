const { isEmpty } = require('lodash');

const BaseContract = require('./baseContract');
const TestEASContract = artifacts.require('TestEAS');

const HASH_SEPARATOR = '@';

class EAS extends BaseContract {
  constructor(aoRegistry) {
    super();

    this.aoRegistry = aoRegistry;
  }

  static async new(aoRegistry) {
    const registry = new EAS(aoRegistry);
    await registry.deploy();

    return registry;
  }

  async deploy() {
    this.contract = await TestEASContract.new(EAS.getAddress(this.aoRegistry));
  }

  static getEvents() {
    return {
      attested: 'Attested',
      revoked: 'Revoked'
    };
  }

  static toBytes32(data) {
    let bytes = data;

    if (!bytes.startsWith('0x')) {
      bytes = `0x${bytes}`;
    }

    const strLength = 2 + 2 * 32; // '0x' + 32 words.
    return bytes.padEnd(strLength, '0');
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

  async getReceivedAttestationsUUIDs(recipient, ao, start, length) {
    return this.contract.getReceivedAttestationsUUIDs.call(EAS.getAddress(recipient), ao, start, length);
  }

  async getReceivedAttestationsUUIDsCount(recipient, ao) {
    return this.contract.getReceivedAttestationsUUIDsCount.call(EAS.getAddress(recipient), ao);
  }

  async getSentAttestationsUUIDs(attester, ao, start, length) {
    return this.contract.getSentAttestationsUUIDs.call(EAS.getAddress(attester), ao, start, length);
  }

  async getSentAttestationsUUIDsCount(recipient, ao) {
    return this.contract.getSentAttestationsUUIDsCount.call(EAS.getAddress(recipient), ao);
  }

  async getRelatedAttestationsUUIDs(uuid, start, length) {
    return this.contract.getRelatedAttestationsUUIDs.call(EAS.toBytes32(uuid), start, length);
  }

  async getRelatedAttestationsUUIDsCount(recipient, ao) {
    return this.contract.getRelatedAttestationsUUIDsCount.call(EAS.getAddress(recipient), ao);
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

  async revoke(uuid, options = {}) {
    if (!isEmpty(options)) {
      return this.contract.revoke(EAS.toBytes32(uuid), options);
    }

    return this.contract.revoke(EAS.toBytes32(uuid));
  }
}

module.exports = EAS;
