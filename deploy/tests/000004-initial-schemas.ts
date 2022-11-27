import { SchemaRegistry } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { ZERO_ADDRESS } from '../../utils/Constants';
import { DeployedContracts } from '../../utils/Deploy';
import { INITIAL_SCHEMAS } from '../scripts/000004-initial-schemas';
import { getSchemaUUID } from '@ethereum-attestation-service/eas-sdk';
import { expect } from 'chai';

describeDeployment(__filename, () => {
  let registry: SchemaRegistry;

  beforeEach(async () => {
    registry = await DeployedContracts.SchemaRegistry.deployed();
  });

  it('should register initial schemas', async () => {
    for (const schema of INITIAL_SCHEMAS) {
      const uuid = getSchemaUUID(schema, ZERO_ADDRESS);
      const schemaRecord = await registry.getSchema(uuid);

      expect(schemaRecord.uuid).to.equal(uuid);
      expect(schemaRecord.schema).to.equal(schema);
      expect(schemaRecord.resolver).to.equal(ZERO_ADDRESS);
    }
  });
});
