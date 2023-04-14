import { EAS__factory } from '../typechain-types';
import { Interface } from '@ethersproject/abi';
import { ContractTransaction, utils } from 'ethers';

const { solidityKeccak256, hexlify, toUtf8Bytes } = utils;

export const getSchemaUID = (schema: string, resolverAddress: string, revocable: boolean) =>
  solidityKeccak256(['string', 'address', 'bool'], [schema, resolverAddress, revocable]);

export const getUID = (
  schema: string,
  recipient: string,
  attester: string,
  time: number,
  expirationTime: number,
  revocable: boolean,
  refUID: string,
  data: string,
  bump: number
) =>
  solidityKeccak256(
    ['bytes', 'address', 'address', 'uint32', 'uint32', 'bool', 'bytes32', 'bytes', 'uint32'],
    [hexlify(toUtf8Bytes(schema)), recipient, attester, time, expirationTime, revocable, refUID, data, bump]
  );

export const getUIDsFromMultiAttestTx = async (
  res: Promise<ContractTransaction> | ContractTransaction
): Promise<string[]> => {
  const receipt = await (await res).wait();

  return getUIDsFromAttestEvents(receipt.events);
};

export const getUIDFromAttestTx = async (res: Promise<ContractTransaction> | ContractTransaction): Promise<string> => {
  return (await getUIDsFromMultiAttestTx(res))[0];
};

export const getUIDFromMultiDelegatedProxyAttestTx = async (
  res: Promise<ContractTransaction> | ContractTransaction
): Promise<string[]> => {
  const receipt = await (await res).wait();

  // eslint-disable-next-line camelcase
  const eas = new Interface(EAS__factory.abi);
  const events = [];

  for (const event of receipt.events || []) {
    events.push({
      event: 'Attested',
      args: await eas.decodeEventLog('Attested', event.data, event.topics)
    });
  }

  return getUIDsFromAttestEvents(events);
};

export const getUIDFromDelegatedProxyAttestTx = async (
  res: Promise<ContractTransaction> | ContractTransaction
): Promise<string> => {
  return (await getUIDFromMultiDelegatedProxyAttestTx(res))[0];
};

export const getUIDsFromAttestEvents = (events?: ReadonlyArray<any>): string[] => {
  if (!events) {
    return [];
  }

  const attestedEvents = events.filter((e) => e.event === 'Attested');
  if (attestedEvents.length === 0) {
    throw new Error('Unable to process attestation events');
  }

  return attestedEvents.map((event) => event.args?.uid);
};
