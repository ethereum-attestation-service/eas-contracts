import { SchemaRegistry } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { DeployedContracts } from '../../utils/Deploy';
import { expect } from 'chai';

describeDeployment(__filename, () => {
  let registry: SchemaRegistry;

  beforeEach(async () => {
    registry = await DeployedContracts.SchemaRegistry.deployed();
  });

  it('should deploy the schema registry', async () => {
    expect(await registry.VERSION()).to.equal('0.18');
  });
});
