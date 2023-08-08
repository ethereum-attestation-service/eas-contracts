import { expect } from 'chai';
import { EAS, SchemaRegistry } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { DeployedContracts } from '../../utils/Deploy';

describeDeployment(__filename, () => {
  let registry: SchemaRegistry;
  let eas: EAS;

  beforeEach(async () => {
    registry = await DeployedContracts.SchemaRegistry.deployed();
    eas = await DeployedContracts.EAS.deployed();
  });

  it('should deploy the EAS', async () => {
    expect(await eas.version()).to.equal('1.1.0');

    expect(await eas.getSchemaRegistry()).to.equal(await registry.getAddress());
  });
});
