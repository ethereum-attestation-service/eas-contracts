import { NO_EXPIRATION, ZERO_ADDRESS, ZERO_BYTES32 } from '../../utils/Constants';
import { execute, InstanceName, setDeploymentMetadata } from '../../utils/Deploy';
import { getSchemaUUID } from '../../utils/EAS';
import Logger from '../../utils/Logger';
import { SCHEMAS } from '../scripts/000003-register-initial-schemas';
import { utils } from 'ethers';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const { defaultAbiCoder } = utils;

const func: DeployFunction = async ({ getNamedAccounts }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();
  const targetSchemaId = getSchemaUUID('bytes32 schemaId,string name', ZERO_ADDRESS, true);

  for (const { schema, name } of SCHEMAS) {
    const schemaId = getSchemaUUID(schema, ZERO_ADDRESS, true);

    await execute({
      name: InstanceName.EAS,
      methodName: 'attest',
      args: [
        {
          schema: targetSchemaId,
          data: {
            recipient: ZERO_ADDRESS,
            expirationTime: NO_EXPIRATION,
            revocable: true,
            refUUID: ZERO_BYTES32,
            data: defaultAbiCoder.encode(['bytes32', 'string'], [schemaId, name]),
            value: 0
          }
        }
      ],
      from: deployer
    });

    Logger.log(`Named schema ${schema} as "${name}"`);
  }

  return true;
};

export default setDeploymentMetadata(__filename, func);
