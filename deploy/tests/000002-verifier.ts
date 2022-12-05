import { EIP712Verifier } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { ATTEST_TYPED_SIGNATURE, EIP712Utils, REVOKE_TYPED_SIGNATURE } from '../../test/helpers/EIP712Utils';
import { DeployedContracts } from '../../utils/Deploy';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const {
  utils: { keccak256, toUtf8Bytes }
} = ethers;

describeDeployment(__filename, () => {
  let verifier: EIP712Verifier;

  beforeEach(async () => {
    verifier = await DeployedContracts.EIP712Verifier.deployed();
  });

  it('should deploy a EIP712 verifier', async () => {
    const utils = await EIP712Utils.fromVerifier(verifier);

    expect(await verifier.VERSION()).to.equal('0.18');

    expect(await verifier.getDomainSeparator()).to.equal(utils.getDomainSeparator());
    expect(await verifier.getAttestTypeHash()).to.equal(keccak256(toUtf8Bytes(ATTEST_TYPED_SIGNATURE)));
    expect(await verifier.getRevokeTypeHash()).to.equal(keccak256(toUtf8Bytes(REVOKE_TYPED_SIGNATURE)));
  });
});
