import { EAS, EIP712Proxy } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import {
  ATTEST_PROXY_TYPED_SIGNATURE,
  EIP712ProxyUtils,
  REVOKE_PROXY_TYPED_SIGNATURE
} from '../../test/helpers/EIP712ProxyUtils';
import { DeployedContracts } from '../../utils/Deploy';
import { EIP712_PROXY_NAME } from '../scripts/000005-eip712-proxy';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const {
  utils: { keccak256, toUtf8Bytes }
} = ethers;

describeDeployment(__filename, () => {
  let eas: EAS;
  let proxy: EIP712Proxy;
  let eip712ProxyUtils: EIP712ProxyUtils;

  beforeEach(async () => {
    eas = await DeployedContracts.EAS.deployed();
    proxy = await DeployedContracts.EIP712Proxy.deployed();

    eip712ProxyUtils = await EIP712ProxyUtils.fromProxy(proxy);
  });

  it('should deploy the EIP712 proxy', async () => {
    expect(await proxy.VERSION()).to.equal('0.1');

    expect(await proxy.getEAS()).to.equal(eas.address);
    expect(await proxy.getDomainSeparator()).to.equal(eip712ProxyUtils.getDomainSeparator(EIP712_PROXY_NAME));
    expect(await proxy.getAttestTypeHash()).to.equal(keccak256(toUtf8Bytes(ATTEST_PROXY_TYPED_SIGNATURE)));
    expect(await proxy.getRevokeTypeHash()).to.equal(keccak256(toUtf8Bytes(REVOKE_PROXY_TYPED_SIGNATURE)));
    expect(await proxy.getName()).to.equal(EIP712_PROXY_NAME);
  });
});
