import fs from 'fs';
import path from 'path';
import Chance from 'chance';
import { AbiCoder, encodeBytes32String, keccak256, toUtf8Bytes, TransactionReceipt, Wallet } from 'ethers';
import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { NO_EXPIRATION, ZERO_ADDRESS, ZERO_BYTES32 } from '../../utils/Constants';
import { execute, getDeploymentDir, InstanceName, isTestnet, setDeploymentMetadata } from '../../utils/Deploy';
import { getSchemaUID, getUIDsFromAttestReceipt } from '../../utils/EAS';
import Logger from '../../utils/Logger';

export const TEST_ATTESTATIONS_OUTPUT_PATH = path.join(getDeploymentDir(), 'test-attestations.json');

export interface TestAttestationData {
  uid: string;
  recipient: string;
  data: Record<string, string | boolean | number>;
}

export interface TestAttestationGroup {
  schema: string;
  data: TestAttestationData[];
}

enum HoldType {
  Free = 0,
  Lease = 1
}

enum UseType {
  Residential = 0,
  Commercial = 1,
  Cultural = 2,
  Educational = 3,
  Governmental = 4
}

type Coordinate = [number, number];

const polygonToSolidity = (coordinates: Coordinate[]): Coordinate[] =>
  coordinates.map(([lat, long]: Coordinate) => [Math.floor(lat * 10 ** 8), Math.floor(long * 10 ** 8)]);

const func: DeployFunction = async ({ getNamedAccounts }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();

  const testAttestations: Record<string, TestAttestationGroup> = {};
  const testAttestationsPerSchema = 20;

  const chance = new Chance();
  const attestationGroups = [
    {
      schema: 'bool like',
      generator: () => {
        const params = {
          like: chance.bool()
        };

        return { data: AbiCoder.defaultAbiCoder().encode(['bool'], Object.values(params)), params };
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
          data: AbiCoder.defaultAbiCoder().encode(['address', 'bool'], Object.values(params)),
          params
        };
      }
    },
    {
      schema: 'bytes32 eventId,uint8 ticketType,uint32 ticketNum',
      generator: () => {
        const params = {
          eventId: encodeBytes32String(chance.string({ length: 31 })),
          ticketType: chance.natural({ max: 2 ** 8 - 1 }),
          ticketNum: chance.natural({ max: 2 ** 32 - 1 })
        };

        return {
          data: AbiCoder.defaultAbiCoder().encode(['bytes32', 'uint8', 'uint32'], Object.values(params)),
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

        return { data: AbiCoder.defaultAbiCoder().encode(['bool'], Object.values(params)), params };
      }
    },
    {
      schema: 'bytes32 name',
      generator: () => {
        const params = {
          name: encodeBytes32String(chance.name())
        };

        return { data: AbiCoder.defaultAbiCoder().encode(['bytes32'], Object.values(params)), params };
      }
    },
    {
      schema: 'string message',
      generator: () => {
        const params = {
          message: chance.sentence()
        };

        return { data: AbiCoder.defaultAbiCoder().encode(['string'], Object.values(params)), params };
      }
    },
    {
      schema: 'bytes32 username',
      generator: () => {
        const params = {
          username: encodeBytes32String(chance.email())
        };

        return { data: AbiCoder.defaultAbiCoder().encode(['bytes32'], Object.values(params)), params };
      }
    },
    {
      schema: 'bool isFriend',
      generator: () => {
        const params = {
          isFriend: chance.bool()
        };

        return { data: AbiCoder.defaultAbiCoder().encode(['bool'], Object.values(params)), params };
      }
    },
    {
      schema: 'bool hasPhoneNumber,bytes32 phoneHash',
      generator: () => {
        const params = {
          hasPhoneNumber: chance.bool(),
          phoneHash: keccak256(toUtf8Bytes(chance.phone({ formatted: false })))
        };

        return { data: AbiCoder.defaultAbiCoder().encode(['bool', 'bytes32'], Object.values(params)), params };
      }
    },
    {
      schema: 'uint256 eventId,uint8 voteIndex',
      generator: () => {
        const params = {
          eventId: chance.natural(),
          voteIndex: chance.natural({ max: 2 ** 8 - 1 })
        };

        return { data: AbiCoder.defaultAbiCoder().encode(['uint256', 'uint8'], Object.values(params)), params };
      }
    },
    {
      schema: 'uint256 postId,bool like',
      generator: () => {
        const params = {
          postId: chance.natural(),
          like: chance.bool()
        };

        return { data: AbiCoder.defaultAbiCoder().encode(['uint256', 'bool'], Object.values(params)), params };
      }
    },
    {
      schema: 'bool hasPassedKYC',
      generator: () => {
        const params = {
          hasPassedKYC: chance.bool()
        };

        return { data: AbiCoder.defaultAbiCoder().encode(['bool'], Object.values(params)), params };
      }
    },
    {
      schema: 'bool isAccreditedInvestor',
      generator: () => {
        const params = {
          isAccreditedInvestor: chance.bool()
        };

        return { data: AbiCoder.defaultAbiCoder().encode(['bool'], Object.values(params)), params };
      }
    },
    {
      schema: 'bytes32 hashOfDocument,string note',
      generator: () => {
        const params = {
          hashOfDocument: keccak256(toUtf8Bytes(chance.paragraph())),
          note: chance.sentence()
        };

        return { data: AbiCoder.defaultAbiCoder().encode(['bytes32', 'string'], Object.values(params)), params };
      }
    }
  ];

  // Generate a few random attestations.
  for (const { schema, generator } of attestationGroups) {
    const schemaId = getSchemaUID(schema, ZERO_ADDRESS, true);
    const requests = [];
    const recipients: string[] = [];
    const parameters: Record<string, string | boolean | number>[] = [];

    Logger.info(`Generating ${testAttestationsPerSchema} test attestations for schema ${schemaId} "${schema}"...`);

    for (let i = 0; i < testAttestationsPerSchema; ++i) {
      const { data, params } = generator();
      const recipient = Wallet.createRandom().address;

      Logger.info(
        `${i + 1}: ${recipient} --> ${JSON.stringify(params, (_, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )}`
      );

      requests.push({
        recipient,
        expirationTime: NO_EXPIRATION,
        revocable: true,
        refUID: ZERO_BYTES32,
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

    const uids: string[] = await getUIDsFromAttestReceipt(res as any as TransactionReceipt);

    testAttestations[schemaId] = {
      schema,
      data: uids.map((uid, i) => ({
        uid,
        recipient: recipients[i],
        data: parameters[i]
      }))
    };
  }

  // Generate a few specific land registry attestations.
  const schema = 'uint8 holdType,uint8 useType,uint64 expiration,int40[2][] polygonArea';
  const schemaId = getSchemaUID(schema, ZERO_ADDRESS, true);
  const requests = [];
  const recipients: string[] = [];
  const parameters: Record<string, any>[] = [];

  for (const params of [
    {
      description: 'Tower of Belem, Lisbon, Portugal',
      holdType: HoldType.Lease,
      useType: UseType.Cultural,
      expiration: NO_EXPIRATION,
      polygonArea: [
        [38.69146, -9.21607],
        [38.69182, -9.21607],
        [38.69172, -9.21574],
        [38.69144, -9.2158]
      ]
    },
    {
      description: 'Statue of Liberty, New York, United States',
      holdType: HoldType.Lease,
      useType: UseType.Cultural,
      expiration: NO_EXPIRATION,
      polygonArea: [
        [40.68886, -74.04463],
        [40.69003, -74.04721],
        [40.69101, -74.04669],
        [40.69065, -74.04429],
        [40.68976, -74.04326],
        [40.68872, -74.0436]
      ]
    },
    {
      description: 'Athens Metro Mall, Agios Dimitrios, Greece',
      holdType: HoldType.Free,
      useType: UseType.Commercial,
      expiration: NO_EXPIRATION,
      polygonArea: [
        [37.93983, 23.73881],
        [37.93885, 23.73929],
        [37.93878, 23.74107],
        [37.94091, 23.74025],
        [37.94066, 23.73934]
      ]
    },
    {
      description: 'Acropolis Museum, Athens, Greece',
      holdType: HoldType.Free,
      useType: UseType.Educational,
      expiration: NO_EXPIRATION,
      polygonArea: [
        [37.9683, 23.72791],
        [37.96902, 23.72815],
        [37.96898, 23.72826],
        [37.96866, 23.72839],
        [37.96869, 23.7289],
        [37.96809, 23.7291]
      ]
    },
    {
      description: 'Karamanlidika restaurant, Athens, Greece',
      holdType: HoldType.Free,
      useType: UseType.Commercial,
      expiration: NO_EXPIRATION,
      polygonArea: [
        [37.98014, 23.72569],
        [37.98015, 23.72557],
        [37.98029, 23.7256],
        [37.98027, 23.72573]
      ]
    },
    {
      description: 'Ermou street, Municipal unit of Polichni, Greece',
      holdType: HoldType.Lease,
      useType: UseType.Residential,
      expiration: NO_EXPIRATION,
      polygonArea: [
        [40.65963, 22.95344],
        [40.65999, 22.95335],
        [40.65999, 22.95328],
        [40.65969, 22.95336],
        [40.65958, 22.95341],
        [40.65923, 22.95403],
        [40.65925, 22.95407],
        [40.65912, 22.95417],
        [40.65912, 22.9541],
        [40.6593, 22.95401]
      ]
    },
    {
      description: 'Hellenic Parliament, Athens, Greece',
      holdType: HoldType.Lease,
      useType: UseType.Governmental,
      expiration: NO_EXPIRATION,
      polygonArea: [
        [37.97597, 23.73636],
        [37.97462, 23.73611],
        [37.97449, 23.73748],
        [37.97581, 23.73787]
      ]
    },
    {
      description: 'Supreme Civil and Criminal Court of Greece, Athens, Greece',
      holdType: HoldType.Lease,
      useType: UseType.Governmental,
      expiration: NO_EXPIRATION,
      polygonArea: [
        [37.98905, 23.75222],
        [37.98864, 23.7522],
        [37.98855, 23.75269],
        [37.98841, 23.75265],
        [37.98835, 23.75298],
        [37.98849, 23.75303],
        [37.98841, 23.75347],
        [37.98859, 23.75354],
        [37.98862, 23.75342],
        [37.98878, 23.75346],
        [37.98874, 23.75369],
        [37.98914, 23.75379],
        [37.9893, 23.75307],
        [37.98942, 23.75248],
        [37.9894, 23.75234]
      ]
    },
    {
      description: 'University of Crete, Gallos, Greece',
      holdType: HoldType.Lease,
      useType: UseType.Educational,
      expiration: NO_EXPIRATION,
      polygonArea: [
        [35.35284, 24.44718],
        [35.35368, 24.44625],
        [35.35508, 24.44724],
        [35.35599, 24.44868],
        [35.35587, 24.45066],
        [35.35514, 24.45324],
        [35.35266, 24.45269],
        [35.35205, 24.45239],
        [35.35157, 24.45082],
        [35.35161, 24.44959],
        [35.35205, 24.44861],
        [35.35222, 24.44773]
      ]
    }
  ]) {
    const { holdType, useType, expiration, polygonArea } = params;
    const data = AbiCoder.defaultAbiCoder().encode(
      ['uint8', 'uint8', 'uint64', 'int40[2][]'],
      [holdType, useType, expiration, polygonToSolidity(polygonArea as Coordinate[])]
    );
    const recipient = Wallet.createRandom().address;

    const extParams = { ...params, holdType: HoldType[holdType], useType: UseType[useType] };
    Logger.info(
      `${recipient} --> ${JSON.stringify({ ...extParams }, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )}`
    );

    requests.push({
      recipient,
      expirationTime: NO_EXPIRATION,
      revocable: true,
      refUID: ZERO_BYTES32,
      data,
      value: 0
    });

    recipients.push(recipient);
    parameters.push(extParams);
  }

  const res = await execute({
    name: InstanceName.EAS,
    methodName: 'multiAttest',
    args: [[{ schema: schemaId, data: requests }]],
    from: deployer
  });

  const uids: string[] = await getUIDsFromAttestReceipt(res as any as TransactionReceipt);

  testAttestations[schemaId] = {
    schema,
    data: uids.map((uid, i) => ({
      uid,
      recipient: recipients[i],
      data: parameters[i]
    }))
  };

  fs.writeFileSync(
    TEST_ATTESTATIONS_OUTPUT_PATH,
    JSON.stringify(testAttestations, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2)
  );

  return true;
};

// Run this deployment script only during test or deployments on testnet
func.skip = async () => !isTestnet(); // eslint-disable-line require-await

export default setDeploymentMetadata(__filename, func);
