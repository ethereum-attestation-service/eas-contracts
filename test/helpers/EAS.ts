import { ethers } from 'hardhat';

const {
  utils: { solidityKeccak256 }
} = ethers;

export const getSchemaUUID = (schema: string, resolver: string) =>
  solidityKeccak256(['bytes', 'address'], [schema, resolver]);

export const getUUID = (
  schema: string,
  recipient: string,
  attester: string,
  time: number,
  expirationTime: number,
  data: string,
  bump: number
) =>
  solidityKeccak256(
    ['bytes', 'address', 'address', 'uint32', 'uint32', 'bytes', 'uint32'],
    [schema, recipient, attester, time, expirationTime, data, bump]
  );
