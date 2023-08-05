import { hexlify, Interface, solidityPackedKeccak256, toUtf8Bytes, TransactionResponse } from 'ethers';
import { EAS__factory } from '../typechain-types';

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

export const getUIDsFromMultiAttestTx = async (
  res: Promise<TransactionResponse> | TransactionResponse
): Promise<string[]> => {
  const tx = await res;
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error(`Unable to confirm: ${tx}`);
  }

  return getUIDsFromAttestEvents(receipt.logs);
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

  // eslint-disable-next-line camelcase
  const eas = new Interface(EAS__factory.abi);
  const logs = [];

  for (const log of receipt.logs || []) {
    logs.push({
      log: 'Attested',
      fragment: {
        name: 'Attested'
      },
      args: eas.decodeEventLog('Attested', log.data, log.topics)
    });
  }

  return getUIDsFromAttestEvents(logs);
};

export const getUIDFromDelegatedProxyAttestTx = async (
  res: Promise<TransactionResponse> | TransactionResponse
): Promise<string> => {
  return (await getUIDFromMultiDelegatedProxyAttestTx(res))[0];
};

export const getUIDsFromAttestEvents = (logs?: ReadonlyArray<any>): string[] => {
  if (!logs) {
    return [];
  }

  const attestedLogs = logs.filter((l) => l.fragment?.name === 'Attested');
  if (attestedLogs.length === 0) {
    throw new Error('Unable to process attestation events');
  }

  // eslint-disable-next-line camelcase
  const eas = new Interface(EAS__factory.abi);
  return attestedLogs.map((log) => log.args.uid ?? eas.decodeEventLog('Attested', log.data, log.topics).uid);
};
