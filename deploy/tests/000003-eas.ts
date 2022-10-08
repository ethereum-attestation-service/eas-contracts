import { EAS, EIP712Verifier, SchemaRegistry } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { DeployedContracts } from '../../utils/Deploy';
import { expect } from 'chai';

describeDeployment(__filename, () => {
  let registry: SchemaRegistry;
  let verifier: EIP712Verifier;
  let eas: EAS;

  beforeEach(async () => {
    registry = await DeployedContracts.SchemaRegistry.deployed();
    verifier = await DeployedContracts.EIP712Verifier.deployed();
    eas = await DeployedContracts.EAS.deployed();
  });

  it('should deploy the EAS', async () => {
    expect(await eas.VERSION()).to.equal('0.12');

    expect(await eas.getSchemaRegistry()).to.equal(registry.address);
    expect(await eas.getEIP712Verifier()).to.equal(verifier.address);
  });
});
