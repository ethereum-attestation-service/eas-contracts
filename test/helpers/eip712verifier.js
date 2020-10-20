const BaseContract = require('./baseContract');
const { utils } = require('ethers');
const { keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack } = utils;

const EIP712VerifierContract = artifacts.require('EIP712Verifier');

class EIP712Verifier extends BaseContract {
  static async new() {
    const verifier = new EIP712Verifier();
    await verifier.deploy();

    return verifier;
  }

  async deploy() {
    this.contract = await EIP712VerifierContract.new();
  }

  async getVersion() {
    return this.contract.VERSION.call();
  }

  async getDomainSeparator() {
    return this.contract.DOMAIN_SEPARATOR.call();
  }

  static async getDomainSeparator(verifier) {
    return keccak256(
      defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [
          keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
          keccak256(toUtf8Bytes('EAS')),
          keccak256(toUtf8Bytes(await verifier.getVersion())),
          1,
          verifier.getAddress()
        ]
      )
    );
  }

  static getAttestTypeHash() {
    return keccak256(
      toUtf8Bytes(
        'Attest(address recipient,uint256 ao,uint256 expirationTime,bytes32 refUUID,bytes data,uint256 nonce)'
      )
    );
  }

  static getRevokeTypeHash() {
    return keccak256(toUtf8Bytes('Revoke(byte32 uuid,uint256 nonce)'));
  }

  async getAttestTypeHash() {
    return this.contract.ATTEST_TYPEHASH.call();
  }

  async getRevokeTypeHash() {
    return this.contract.REVOKE_TYPEHASH.call();
  }

  async getAttestDigest(recipient, ao, expirationTime, refUUID, data, nonce) {
    const DOMAIN_SEPARATOR = await this.getDomainSeparator();

    return keccak256(
      solidityPack(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        [
          '0x19',
          '0x01',
          DOMAIN_SEPARATOR,
          keccak256(
            defaultAbiCoder.encode(
              ['bytes32', 'address', 'uint256', 'uint256', 'bytes32', 'bytes', 'uint256'],
              [
                EIP712Verifier.getAttestTypeHash(),
                EIP712Verifier.getAddress(recipient),
                ao.toString(),
                expirationTime.toString(),
                EIP712Verifier.toBytes32(refUUID),
                Buffer.from(data.slice(2), 'hex'),
                nonce.toString()
              ]
            )
          )
        ]
      )
    );
  }

  async getRevokeDigest(uuid, nonce) {
    const DOMAIN_SEPARATOR = await this.getDomainSeparator();

    return keccak256(
      solidityPack(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        [
          '0x19',
          '0x01',
          DOMAIN_SEPARATOR,
          keccak256(
            defaultAbiCoder.encode(
              ['bytes32', 'bytes32', 'uint256'],
              [EIP712Verifier.getRevokeTypeHash(), EIP712Verifier.toBytes32(uuid), nonce.toString()]
            )
          )
        ]
      )
    );
  }

  async getNonce(account) {
    return this.contract.nonces(EIP712Verifier.getAddress(account));
  }
}

module.exports = EIP712Verifier;
