const { expect } = require('chai');
const { utils } = require('ethers');
const { Proxy, ATTEST_TYPE, REVOKE_TYPE } = require('@ethereum-attestation-service/sdk');

const { keccak256, toUtf8Bytes } = utils;

const EIP712Verifier = require('./helpers/eip712Verifier');

contract('EIP712Verifier', () => {
  let verifier;

  beforeEach(async () => {
    verifier = await EIP712Verifier.new();
  });

  it('should return the correct domain separator', async () => {
    const proxy = new Proxy({
      address: verifier.getAddress(),
      version: await verifier.getVersion(),
      chainId: 1
    });
    expect(await verifier.getDomainSeparator()).to.eql(proxy.getDomainSeparator());
  });

  it('should return the attest type hash', async () => {
    expect(await verifier.getAttestTypeHash()).to.eql(keccak256(toUtf8Bytes(ATTEST_TYPE)));
  });

  it('should return the revoke type hash', async () => {
    expect(await verifier.getRevokeTypeHash()).to.eql(keccak256(toUtf8Bytes(REVOKE_TYPE)));
  });
});
