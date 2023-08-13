import {
  hexlify,
  Interface,
  solidityPackedKeccak256,
  toUtf8Bytes,
  TransactionReceipt,
  TransactionResponse
} from 'ethers';
import { EAS__factory } from '../typechain-types';

enum Event {
  Attested = 'Attested',
  Timestamped = 'Timestamped',
  RevokedOffchain = 'RevokedOffchain'
}

export const getSchemaUID = (schema: string, resolverAddress: string, revocable: boolean) =>
  solidityPackedKeccak256(['string', 'address', 'bool'], [schema, resolverAddress, revocable]);

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
  solidityPackedKeccak256(
    ['bytes', 'address', 'address', 'uint32', 'uint32', 'bool', 'bytes32', 'bytes', 'uint32'],
    [hexlify(toUtf8Bytes(schema)), recipient, attester, time, expirationTime, revocable, refUID, data, bump]
  );

const getDataFromReceipt = (receipt: TransactionReceipt, event: Event, attribute: string): string[] => {
  // eslint-disable-next-line camelcase
  const eas = new Interface(EAS__factory.abi);
  const logs = [];

  for (const log of receipt.logs || []) {
    logs.push({
      ...log,
      log: event,
      fragment: {
        name: event
      },
      args: eas.decodeEventLog(event, log.data, log.topics)
    });
  }

  if (!logs) {
    return [];
  }

  const filteredLogs = logs.filter((l) => l.fragment?.name === event);
  if (filteredLogs.length === 0) {
    throw new Error(`Unable to process ${event} events`);
  }

  return filteredLogs.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (log: any) => eas.decodeEventLog(event, log.data, log.topics)[attribute]
  );
};

export const getUIDsFromAttestReceipt = (receipt: TransactionReceipt): string[] =>
  getDataFromReceipt(receipt, Event.Attested, 'uid');

export const getTimestampFromTimestampReceipt = (receipt: TransactionReceipt): bigint[] =>
  getDataFromReceipt(receipt, Event.Timestamped, 'timestamp').map((s) => BigInt(s));

export const getTimestampFromOffchainRevocationReceipt = (receipt: TransactionReceipt): bigint[] =>
  getDataFromReceipt(receipt, Event.RevokedOffchain, 'timestamp').map((s) => BigInt(s));

export const getUIDsFromMultiAttestTx = async (
  res: Promise<TransactionResponse> | TransactionResponse
): Promise<string[]> => {
  const tx = await res;
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error(`Unable to confirm: ${tx}`);
  }

  return getUIDsFromAttestReceipt(receipt);
};

export const getUIDFromAttestTx = async (res: Promise<TransactionResponse> | TransactionResponse): Promise<string> => {
  return (await getUIDsFromMultiAttestTx(res))[0];
};

export const getUIDFromMultiDelegatedProxyAttestTx = async (
  res: Promise<TransactionResponse> | TransactionResponse
): Promise<string[]> => {
  const tx = await res;
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error(`Unable to confirm: ${tx}`);
  }

  return getUIDFromMultiDelegatedProxyAttestReceipt(receipt);
};

export const getUIDFromMultiDelegatedProxyAttestReceipt = async (
  res: Promise<TransactionReceipt> | TransactionReceipt
): Promise<string[]> => {
  const receipt = await res;
  if (!receipt) {
    throw new Error(`Unable to confirm: ${res}`);
  }

  return getUIDsFromAttestReceipt(receipt);
};

export const getUIDFromDelegatedProxyAttestTx = async (
  res: Promise<TransactionResponse> | TransactionResponse
): Promise<string> => {
  return (await getUIDFromMultiDelegatedProxyAttestTx(res))[0];
};

export const getUIDFromDelegatedProxyAttestReceipt = async (
  res: Promise<TransactionReceipt> | TransactionReceipt
): Promise<string> => {
  return (await getUIDFromMultiDelegatedProxyAttestReceipt(res))[0];
};
