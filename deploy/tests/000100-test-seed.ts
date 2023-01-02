import { EAS } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { DeployedContracts } from '../../utils/Deploy';
import Logger from '../../utils/Logger';
import { TEST_ATTESTATIONS_OUTPUT_PATH, TestAttestationGroup } from '../scripts/000100-test-seed';
import { expect } from 'chai';
import fs from 'fs';

describeDeployment(__filename, () => {
  let eas: EAS;

  beforeEach(async () => {
    eas = await DeployedContracts.EAS.deployed();
  });

  it('should generate test attestations', async () => {
    const testAttestations: Record<string, TestAttestationGroup> = JSON.parse(
      fs.readFileSync(TEST_ATTESTATIONS_OUTPUT_PATH, 'utf-8')
    );

    for (const [schemaId, { schema, data }] of Object.entries(testAttestations)) {
      Logger.info(`Testing generated attestations for ${schemaId} "${schema}"...`);

      for (const { uuid, recipient } of data) {
        const attestation = await eas.getAttestation(uuid);

        expect(attestation.uuid).to.equal(uuid);
        expect(attestation.schema).to.equal(schema);
        expect(attestation.recipient).to.equal(recipient);
      }
    }
  });
});
