import { ZERO_ADDRESS } from '../../utils/Constants';
import { execute, InstanceName, setDeploymentMetadata } from '../../utils/Deploy';
import Logger from '../../utils/Logger';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const SCHEMAS = [
  { schema: 'bytes32 schemaId,string name', name: 'Name a Schema' },
  { schema: 'bool like', name: 'Like an Entity' },
  { schema: 'address contractAddress,bool trusted', name: 'Trust a Contract' },
  { schema: 'bytes32 eventId,uint8 ticketType,uint32 ticketNum', name: 'Create Event Ticket' },
  { schema: 'bool isHuman', name: 'Is a Human' },
  { schema: 'bytes32 name', name: 'Name Something' },
  { schema: 'string message', name: 'Make a Statement' },
  { schema: 'bytes32 username', name: 'Username' },
  { schema: 'bool isFriend', name: 'Is a Friend' },
  { schema: 'bool hasPhoneNumber,bytes32 phoneHash', name: 'Has phone number' },
  { schema: 'uint256 eventId,uint8 voteIndex', name: 'Vote' },
  { schema: 'uint256 postId,bool like', name: 'Like a Post' },
  { schema: 'bool hasPassedKYC', name: 'Passed KYC' },
  { schema: 'bool isAccreditedInvestor', name: 'Is an Accredited Investor' },
  { schema: 'bytes32 hashOfDocument,string note', name: 'Sign Document' },
  { schema: 'uint8 landType,uint64 expiration,int40[2][] polygonArea', name: 'Land Registry' }
];

const func: DeployFunction = async ({ getNamedAccounts }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();

  for (const { schema } of SCHEMAS) {
    const res = await execute({
      name: InstanceName.SchemaRegistry,
      methodName: 'register',
      args: [schema, ZERO_ADDRESS, true],
      from: deployer
    });

    Logger.log(`Registered schema ${schema} with UUID ${res.events?.find((e) => e.event === 'Registered').args.uuid}`);
  }

  return true;
};

export default setDeploymentMetadata(__filename, func);
