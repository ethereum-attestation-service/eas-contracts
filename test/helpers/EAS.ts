import { SchemaRegistry, SchemaResolver, TestEAS } from '../../typechain-types';
import { expect } from 'chai';
import { BigNumberish, ContractTransaction, utils, Wallet } from 'ethers';
import { ethers } from 'hardhat';

const { solidityKeccak256, hexlify, toUtf8Bytes } = utils;

export const getSchemaUUID = (schema: string, resolverAddress: string, revocable: boolean) =>
  solidityKeccak256(['string', 'address', 'bool'], [schema, resolverAddress, revocable]);

export const getUUID = (
  schema: string,
  recipient: string,
  attester: string,
  time: number,
  expirationTime: number,
  revocable: boolean,
  refUUID: string,
  data: string,
  bump: number
) =>
  solidityKeccak256(
    ['bytes', 'address', 'address', 'uint32', 'uint32', 'bool', 'bytes32', 'bytes', 'uint32'],
    [hexlify(toUtf8Bytes(schema)), recipient, attester, time, expirationTime, revocable, refUUID, data, bump]
  );

interface Options {
  from?: Wallet;
  value?: BigNumberish;
  bump?: number;
  delegate?: boolean;
}

export const registerSchema = async (
  schema: string,
  registry: SchemaRegistry,
  resolver: SchemaResolver | string,
  revocable: boolean
) => {
  const address = typeof resolver === 'string' ? resolver : resolver.address;
  await registry.register(schema, address, revocable);

  return getSchemaUUID(schema, address, revocable);
};

export const getUUIDFromAttestTx = async (res: Promise<ContractTransaction> | ContractTransaction) => {
  const receipt = await (await res).wait();
  const event = receipt.events?.find((e) => e.event === 'Attested');
  if (!event) {
    throw new Error('Unable to process attestation event');
  }
  return event.args?.uuid;
};

export const expectAttestation = async (
  eas: TestEAS,
  recipient: string,
  schema: string,
  expirationTime: number,
  revocable: boolean,
  refUUID: string,
  data: any,
  options?: Options
) => {
  const txSender = options?.from || (await ethers.getSigners())[0];

  const res = await eas
    .connect(txSender)
    .attest(recipient, schema, expirationTime, revocable, refUUID, data, { value: options?.value });

  const uuid = await getUUIDFromAttestTx(res);

  await expect(res).to.emit(eas, 'Attested').withArgs(recipient, txSender.address, uuid, schema);

  const attestation = await eas.getAttestation(uuid);
  expect(attestation.uuid).to.equal(uuid);
  expect(attestation.schema).to.equal(schema);
  expect(attestation.recipient).to.equal(recipient);
  expect(attestation.attester).to.equal(txSender.address);
  expect(attestation.time).to.equal(await eas.getTime());
  expect(attestation.expirationTime).to.equal(expirationTime);
  expect(attestation.revocationTime).to.equal(0);
  expect(attestation.revocable).to.equal(revocable);
  expect(attestation.refUUID).to.equal(refUUID);
  expect(attestation.data).to.equal(data);

  return { uuid, res };
};

export const expectFailedAttestation = async (
  eas: TestEAS,
  recipient: string,
  as: string,
  expirationTime: number,
  revocable: boolean,
  refUUID: string,
  data: any,
  err: string,
  options?: Options
) => {
  const txSender = options?.from || (await ethers.getSigners())[0];

  await expect(
    eas.connect(txSender).attest(recipient, as, expirationTime, revocable, refUUID, data, { value: options?.value })
  ).to.be.revertedWith(err);
};

export const expectRevocation = async (eas: TestEAS, uuid: string, options?: Options) => {
  const txSender = options?.from || (await ethers.getSigners())[0];
  const attestation = await eas.getAttestation(uuid);

  const res = await eas.connect(txSender).revoke(uuid, { value: options?.value });

  await expect(res).to.emit(eas, 'Revoked').withArgs(attestation.recipient, txSender.address, uuid, attestation.schema);

  const attestation2 = await eas.getAttestation(uuid);
  expect(attestation2.revocationTime).to.equal(await eas.getTime());

  return res;
};

export const expectFailedRevocation = async (eas: TestEAS, uuid: string, err: string, options?: Options) => {
  const txSender = options?.from || (await ethers.getSigners())[0];

  await expect(eas.connect(txSender).revoke(uuid, { value: options?.value })).to.be.revertedWith(err);
};
