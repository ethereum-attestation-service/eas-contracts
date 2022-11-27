import { EIP712Verifier } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { MAINNET_CHAIN_ID } from '../../utils/Constants';
import { DeployedContracts } from '../../utils/Deploy';
import { ATTEST_TYPED_SIGNATURE, Delegation, REVOKE_TYPED_SIGNATURE } from '@ethereum-attestation-service/eas-sdk';
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
    const delegation = new Delegation({
      address: verifier.address,
      version: await verifier.VERSION(),
      chainId: MAINNET_CHAIN_ID
    });

    expect(await verifier.VERSION()).to.equal('0.16');

    expect(await verifier.getDomainSeparator()).to.equal(delegation.getDomainSeparator());
    expect(await verifier.getAttestTypeHash()).to.equal(keccak256(toUtf8Bytes(ATTEST_TYPED_SIGNATURE)));
    expect(await verifier.getRevokeTypeHash()).to.equal(keccak256(toUtf8Bytes(REVOKE_TYPED_SIGNATURE)));
  });
});
