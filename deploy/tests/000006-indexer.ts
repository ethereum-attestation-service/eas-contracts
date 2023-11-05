import { expect } from 'chai';
import { EAS, Indexer } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { DeployedContracts } from '../../utils/Deploy';

describeDeployment(__filename, () => {
  let eas: EAS;
  let indexer: Indexer;

  beforeEach(async () => {
    eas = await DeployedContracts.EAS.deployed();
    indexer = await DeployedContracts.Indexer.deployed();
  });

  it('should deploy the indexer', async () => {
    expect(await indexer.version()).to.equal('1.3.0');

    expect(await indexer.getEAS()).to.equal(await eas.getAddress());
  });
});
