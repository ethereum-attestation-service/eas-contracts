import { SchemaRegistry, SchemaResolver, TestEAS } from '../../typechain-types';
import { expect } from 'chai';
import { BigNumberish, Wallet } from 'ethers';
import { ethers } from 'hardhat';

const {
  utils: { solidityKeccak256 }
} = ethers;

export const getSchemaUUID = (schema: string, resolver: string) =>
  solidityKeccak256(['string', 'address'], [schema, resolver]);

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

interface Options {
  from?: Wallet;
  value?: BigNumberish;
  bump?: number;
  delegate?: boolean;
}

export const registerSchema = async (schema: string, registry: SchemaRegistry, resolver: SchemaResolver | string) => {
  const address = typeof resolver === 'string' ? resolver : resolver.address;
  await registry.register(schema, address);

  return getSchemaUUID(schema, address);
};

export const expectAttestation = async (
  eas: TestEAS,
  recipient: string,
  schema: string,
  expirationTime: number,
  refUUID: string,
  data: any,
  options?: Options
) => {
  const txSender = options?.from || (await ethers.getSigners())[0];

  const res = await eas
    .connect(txSender)
    .attest(recipient, schema, expirationTime, refUUID, data, { value: options?.value });

  const uuid = getUUID(
    schema,
    recipient,
    txSender.address,
    await eas.getTime(),
    expirationTime,
    data,
    options?.bump ?? 0
  );

  await expect(res).to.emit(eas, 'Attested').withArgs(recipient, txSender.address, uuid, schema);

  const attestation = await eas.getAttestation(uuid);
  expect(attestation.uuid).to.equal(uuid);
  expect(attestation.schema).to.equal(schema);
  expect(attestation.recipient).to.equal(recipient);
  expect(attestation.attester).to.equal(txSender.address);
  expect(attestation.time).to.equal(await eas.getTime());
  expect(attestation.expirationTime).to.equal(expirationTime);
  expect(attestation.revocationTime).to.equal(0);
  expect(attestation.refUUID).to.equal(refUUID);
  expect(attestation.data).to.equal(data);

  return uuid;
};

export const expectFailedAttestation = async (
  eas: TestEAS,
  recipient: string,
  as: string,
  expirationTime: number,
  refUUID: string,
  data: any,
  err: string,
  options?: Options
) => {
  const txSender = options?.from || (await ethers.getSigners())[0];

  await expect(
    eas.connect(txSender).attest(recipient, as, expirationTime, refUUID, data, { value: options?.value })
  ).to.be.revertedWith(err);
};

export const expectRevocation = async (eas: TestEAS, uuid: string, options?: Options) => {
  const txSender = options?.from || (await ethers.getSigners())[0];
  const attestation = await eas.getAttestation(uuid);

  const res = await eas.connect(txSender).revoke(uuid);

  await expect(res).to.emit(eas, 'Revoked').withArgs(attestation.recipient, txSender.address, uuid, attestation.schema);

  const attestation2 = await eas.getAttestation(uuid);
  expect(attestation2.revocationTime).to.equal(await eas.getTime());
};

export const expectFailedRevocation = async (eas: TestEAS, uuid: string, err: string, options?: Options) => {
  const txSender = options?.from || (await ethers.getSigners())[0];

  await expect(eas.connect(txSender).revoke(uuid)).to.be.revertedWith(err);
};
