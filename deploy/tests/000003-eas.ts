import { ASRegistry, EAS, EIP712Verifier } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { DeployedContracts } from '../../utils/Deploy';
import { expect } from 'chai';

describeDeployment(__filename, () => {
  let registry: ASRegistry;
  let verifier: EIP712Verifier;
  let eas: EAS;

  beforeEach(async () => {
    registry = await DeployedContracts.ASRegistry.deployed();
    verifier = await DeployedContracts.EIP712Verifier.deployed();
    eas = await DeployedContracts.EAS.deployed();
  });

  it('should deploy the EAS', async () => {
    expect(await eas.VERSION()).to.equal('0.10');

    expect(await eas.getASRegistry()).to.equal(registry.address);
    expect(await eas.getEIP712Verifier()).to.equal(verifier.address);
  });
});
