import { ASRegistry } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { DeployedContracts } from '../../utils/Deploy';
import { expect } from 'chai';

describeDeployment(__filename, () => {
  let registry: ASRegistry;

  beforeEach(async () => {
    registry = await DeployedContracts.ASRegistry.deployed();
  });

  it('should deploy the schema registry', async () => {
    expect(await registry.VERSION()).to.equal('0.10');

    expect(await registry.getASCount()).to.equal(0);
  });
});
