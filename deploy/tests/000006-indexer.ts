import { expect } from 'chai';
import { EAS, EASIndexer } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { DeployedContracts } from '../../utils/Deploy';

describeDeployment(__filename, () => {
  let eas: EAS;
  let indexer: EASIndexer;

  beforeEach(async () => {
    eas = await DeployedContracts.EAS.deployed();
    indexer = await DeployedContracts.EASIndexer.deployed();
  });

  it('should deploy the indexer', async () => {
    expect(await indexer.version()).to.equal('1.2.0');

    expect(await indexer.getEAS()).to.equal(await eas.getAddress());
  });
});
