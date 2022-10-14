import { ZERO_ADDRESS } from '../../utils/Constants';
import { execute, InstanceName, setDeploymentMetadata } from '../../utils/Deploy';
import Logger from '../../utils/Logger';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const INITIAL_SCHEMAS = [
  'bool like',
  'address contractAddress,bool trusted',
  'bytes32 eventId,uint8 ticketType,uint32 ticketNum',
  'bool isHuman',
  'bytes32 name',
  'bytes message',
  'bytes32 username',
  'bool isFriend'
];

const func: DeployFunction = async ({ getNamedAccounts }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();

  for (const schema of INITIAL_SCHEMAS) {
    const res = await execute({
      name: InstanceName.SchemaRegistry,
      methodName: 'register',
      args: [schema, ZERO_ADDRESS],
      from: deployer
    });

    Logger.log(`Registered schema ${schema} with UUID ${res.events?.find((e) => e.event === 'Registered').args.uuid}`);
  }

  return true;
};

export default setDeploymentMetadata(__filename, func);
