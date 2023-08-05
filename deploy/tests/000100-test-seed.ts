import fs from 'fs';
import { expect } from 'chai';
import { EAS } from '../../components/Contracts';
import { describeDeployment } from '../../test/helpers/Deploy';
import { DeployedContracts } from '../../utils/Deploy';
import Logger from '../../utils/Logger';
import { TEST_ATTESTATIONS_OUTPUT_PATH, TestAttestationGroup } from '../scripts/000100-test-seed';

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

      for (const { uid, recipient } of data) {
        const attestation = await eas.getAttestation(uid);

        expect(attestation.uid).to.equal(uid);
        expect(attestation.schema).to.equal(schema);
        expect(attestation.recipient).to.equal(recipient);
      }
    }
  });
});
