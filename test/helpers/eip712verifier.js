const { utils } = require('ethers');
const { Proxy } = require('@ethereum-attestation-service/sdk');
const { ecsign } = require('ethereumjs-util');
const BaseContract = require('./baseContract');

const { keccak256, defaultAbiCoder, solidityPack } = utils;

const EIP712VerifierContract = artifacts.require('EIP712Verifier');

class EIP712Verifier extends BaseContract {
  static async new() {
    const verifier = new EIP712Verifier();
    await verifier.deploy();
    await verifier.initProxy();

    return verifier;
  }

  async deploy() {
    this.contract = await EIP712VerifierContract.new();
  }

  async initProxy() {
    this.proxy = new Proxy({
      address: this.getAddress(),
      version: await this.getVersion(),
      chainId: 1
    });
  }

  async getVersion() {
    return this.contract.VERSION.call();
  }

  async getDomainSeparator() {
    return this.contract.DOMAIN_SEPARATOR.call();
  }

  async getAttestTypeHash() {
    return this.contract.ATTEST_TYPEHASH.call();
  }

  async getRevokeTypeHash() {
    return this.contract.REVOKE_TYPEHASH.call();
  }

  async getAttestationRequest(recipient, ao, expirationTime, refUUID, data, nonce, privateKey) {
    return this.proxy.getAttestationRequest(
      {
        recipient,
        ao: ao.toNumber(),
        expirationTime: expirationTime.toString(),
        refUUID: EIP712Verifier.toBytes32(refUUID),
        data: Buffer.from(data.slice(2), 'hex'),
        nonce: nonce.toNumber()
      },
      async (message) => {
        const { v, r, s } = ecsign(message, Buffer.from(privateKey, 'hex'));
        return { v, r, s };
      }
    );
  }

  async getRevocationRequest(uuid, nonce, privateKey) {
    return this.proxy.getRevocationRequest(
      {
        uuid: EIP712Verifier.toBytes32(uuid),
        nonce: nonce.toNumber()
      },
      async (message) => {
        const { v, r, s } = ecsign(message, Buffer.from(privateKey, 'hex'));
        return { v, r, s };
      }
    );
  }

  async getNonce(account) {
    return this.contract.nonces(EIP712Verifier.getAddress(account));
  }
}

module.exports = EIP712Verifier;
