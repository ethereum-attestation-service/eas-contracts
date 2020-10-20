const { expect } = require('chai');

const EIP712Verifier = require('./helpers/eip712Verifier');

contract('EIP712Verifier', () => {
  let verifier;

  beforeEach(async () => {
    verifier = await EIP712Verifier.new();
  });

  it('should return the correct domain separator', async () => {
    expect(await EIP712Verifier.getDomainSeparator(verifier)).to.eql(await verifier.getDomainSeparator());
  });

  it('should return the attest type hash', async () => {
    expect(EIP712Verifier.getAttestTypeHash()).to.eql(await verifier.getAttestTypeHash());
  });

  it('should return the revoke type hash', async () => {
    expect(EIP712Verifier.getRevokeTypeHash()).to.eql(await verifier.getRevokeTypeHash());
  });
});
