import { NO_EXPIRATION, ZERO_ADDRESS, ZERO_BYTES32 } from '../../utils/Constants';
import {
  execute,
  getDeploymentDir,
  InstanceName,
  isMainnetFork,
  isTestnet,
  setDeploymentMetadata
} from '../../utils/Deploy';
import { getSchemaUUID, getUUIDsFromAttestEvents } from '../../utils/EAS';
import Logger from '../../utils/Logger';
import Chance from 'chance';
import { utils, Wallet } from 'ethers';
import fs from 'fs';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import path from 'path';

const { defaultAbiCoder, formatBytes32String, keccak256, toUtf8Bytes } = utils;

export const TEST_ATTESTATIONS_OUTPUT_PATH = path.join(getDeploymentDir(), 'test-attestations.json');

export interface TestAttestationData {
  uuid: string;
  recipient: string;
  data: Record<string, string | boolean | number>;
}

export interface TestAttestationGroup {
  schema: string;
  data: TestAttestationData[];
}

const func: DeployFunction = async ({ getNamedAccounts }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();

  const testAttestations: Record<string, TestAttestationGroup> = {};
  const testAttestationsPerSchema = 100;

  const chance = new Chance();
  const attestationGroups = [
    {
      schema: 'bool like',
      generator: () => {
        const params = {
          like: chance.bool()
        };

        return { data: defaultAbiCoder.encode(['bool'], Object.values(params)), params };
      }
    },
    {
      schema: 'address contractAddress,bool trusted',
      generator: () => {
        const params = {
          contractAddress: Wallet.createRandom().address,
          trusted: chance.bool()
        };

        return {
          data: defaultAbiCoder.encode(['address', 'bool'], Object.values(params)),
          params
        };
      }
    },
    {
      schema: 'bytes32 eventId,uint8 ticketType,uint32 ticketNum',
      generator: () => {
        const params = {
          eventId: formatBytes32String(chance.string({ length: 31 })),
          ticketType: chance.natural({ max: 2 ** 8 - 1 }),
          ticketNum: chance.natural({ max: 2 ** 32 - 1 })
        };

        return {
          data: defaultAbiCoder.encode(['bytes32', 'uint8', 'uint32'], Object.values(params)),
          params
        };
      }
    },
    {
      schema: 'bool isHuman',
      generator: () => {
        const params = {
          isHuman: chance.bool()
        };

        return { data: defaultAbiCoder.encode(['bool'], Object.values(params)), params };
      }
    },
    {
      schema: 'bytes32 name',
      generator: () => {
        const params = {
          name: formatBytes32String(chance.name())
        };

        return { data: defaultAbiCoder.encode(['bytes32'], Object.values(params)), params };
      }
    },
    {
      schema: 'string message',
      generator: () => {
        const params = {
          message: chance.sentence()
        };

        return { data: defaultAbiCoder.encode(['string'], Object.values(params)), params };
      }
    },
    {
      schema: 'bytes32 username',
      generator: () => {
        const params = {
          username: formatBytes32String(chance.email())
        };

        return { data: defaultAbiCoder.encode(['bytes32'], Object.values(params)), params };
      }
    },
    {
      schema: 'bool isFriend',
      generator: () => {
        const params = {
          isFriend: chance.bool()
        };

        return { data: defaultAbiCoder.encode(['bool'], Object.values(params)), params };
      }
    },
    {
      schema: 'bool hasPhoneNumber, bytes32 phoneHash',
      generator: () => {
        const params = {
          hasPhoneNumber: chance.bool(),
          phoneHash: keccak256(toUtf8Bytes(chance.phone({ formatted: false })))
        };

        return { data: defaultAbiCoder.encode(['bool', 'bytes32'], Object.values(params)), params };
      }
    },
    {
      schema: 'uint256 eventId, uint8 voteIndex',
      generator: () => {
        const params = {
          eventId: chance.natural(),
          voteIndex: chance.natural({ max: 2 ** 8 - 1 })
        };

        return { data: defaultAbiCoder.encode(['uint256', 'uint8'], Object.values(params)), params };
      }
    },
    {
      schema: 'uint256 postId, bool like',
      generator: () => {
        const params = {
          postId: chance.natural(),
          like: chance.bool()
        };

        return { data: defaultAbiCoder.encode(['uint256', 'bool'], Object.values(params)), params };
      }
    },
    {
      schema: 'bool hasPassedKYC',
      generator: () => {
        const params = {
          hasPassedKYC: chance.bool()
        };

        return { data: defaultAbiCoder.encode(['bool'], Object.values(params)), params };
      }
    },
    {
      schema: 'bool isAccreditedInvestor',
      generator: () => {
        const params = {
          isAccreditedInvestor: chance.bool()
        };

        return { data: defaultAbiCoder.encode(['bool'], Object.values(params)), params };
      }
    },
    {
      schema: 'bytes32 hashOfDocument, string note',
      generator: () => {
        const params = {
          hashOfDocument: keccak256(toUtf8Bytes(chance.paragraph())),
          note: chance.sentence()
        };

        return { data: defaultAbiCoder.encode(['bytes32', 'string'], Object.values(params)), params };
      }
    }
  ];

  for (const { schema, generator } of attestationGroups) {
    const schemaId = getSchemaUUID(schema, ZERO_ADDRESS, true);
    const requests = [];
    const recipients: string[] = [];
    const parameters: Record<string, string | boolean | number>[] = [];

    Logger.info(`Generating ${testAttestationsPerSchema} test attestations for schema ${schemaId} "${schema}"...`);

    for (let i = 0; i < testAttestationsPerSchema; ++i) {
      const { data, params } = generator();
      const recipient = Wallet.createRandom().address;

      Logger.info(`${i + 1}: ${recipient} --> ${JSON.stringify(params)}`);

      requests.push({
        recipient,
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUUID: ZERO_BYTES32,
        data,
        value: 0
      });

      recipients.push(recipient);
      parameters.push(params);
    }

    const res = await execute({
      name: InstanceName.EAS,
      methodName: 'multiAttest',
      args: [[{ schema: schemaId, data: requests }]],
      from: deployer
    });

    const uuids: string[] = await getUUIDsFromAttestEvents(res.events);

    testAttestations[schemaId] = {
      schema,
      data: uuids.map((uuid, i) => ({
        uuid,
        recipient: recipients[i],
        data: parameters[i]
      }))
    };
  }

  fs.writeFileSync(TEST_ATTESTATIONS_OUTPUT_PATH, JSON.stringify(testAttestations, null, 2));

  return true;
};

// Run this deployment script only during test or deployments on testnet
func.skip = async () => !isMainnetFork() && !isTestnet();

export default setDeploymentMetadata(__filename, func);
