import { expect } from 'chai';
import { SchemaRegistry } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { DeployedContracts } from '../../utils/Deploy';

describeDeployment(__filename, () => {
  let registry: SchemaRegistry;

  beforeEach(async () => {
    registry = await DeployedContracts.SchemaRegistry.deployed();
  });

  it('should deploy the schema registry', async () => {
    expect(await registry.version()).to.equal('1.1.0');
  });
});
