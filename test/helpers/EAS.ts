import { EIP712Verifier, SchemaRegistry, SchemaResolver, TestEAS } from '../../typechain-types';
import { ZERO_BYTES32 } from '../../utils/Constants';
import { EIP712Utils } from './EIP712Utils';
import { getTransactionCost } from './Transaction';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, ContractTransaction, utils, Wallet } from 'ethers';
import { ethers } from 'hardhat';

const { solidityKeccak256, hexlify, toUtf8Bytes } = utils;
const {
  provider: { getBalance }
} = ethers;

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

export enum SignatureType {
  Direct = 'direct',
  Delegated = 'delegated'
}

export interface AttestationOptions {
  signatureType?: SignatureType;
  from: Wallet | SignerWithAddress;
  value?: BigNumberish;
  bump?: number;
  skipBalanceCheck?: boolean;
}

export interface AttestationRequest {
  eas: TestEAS;
  verifier?: EIP712Verifier;
  eip712Utils?: EIP712Utils;
  recipient: string;
  schema: string;
  expirationTime: number;
  revocable?: boolean;
  refUUID?: string;
  data?: any;
  value?: BigNumberish;
}

export interface RevocationOptions {
  signatureType?: SignatureType;
  from: Wallet | SignerWithAddress;
  value?: BigNumberish;
  skipBalanceCheck?: boolean;
}

export interface RevocationRequest {
  eas: TestEAS;
  verifier?: EIP712Verifier;
  eip712Utils?: EIP712Utils;
  uuid: string;
  value?: BigNumberish;
}

export const expectAttestation = async (request: AttestationRequest, options: AttestationOptions) => {
  const {
    eas,
    verifier,
    eip712Utils,
    recipient,
    schema,
    expirationTime,
    revocable = true,
    refUUID = ZERO_BYTES32,
    data = ZERO_BYTES32,
    value = 0
  } = request;
  const { from: txSender, signatureType = SignatureType.Direct } = options;

  const prevBalance = await getBalance(txSender.address);

  const msgValue = BigNumber.from(options.value ?? value);
  let uuid;

  let res: ContractTransaction;

  switch (signatureType) {
    case SignatureType.Direct: {
      res = await eas.connect(txSender).attest(
        { recipient, schema, expirationTime, revocable, refUUID, data, value },
        {
          value: msgValue
        }
      );

      uuid = await getUUIDFromAttestTx(res);

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils || !verifier) {
        throw new Error('Invalid verifier');
      }

      const request = await eip712Utils.signDelegatedAttestation(
        txSender,
        recipient,
        schema,
        expirationTime,
        revocable,
        refUUID,
        data,
        await verifier.getNonce(txSender.address)
      );

      expect(await eip712Utils.verifyDelegatedAttestationSignature(txSender.address, request)).to.be.true;

      res = await eas.connect(txSender).attestByDelegation(
        {
          request: { recipient, schema, expirationTime, revocable, refUUID, data, value },
          signature: {
            attester: txSender.address,
            v: request.v,
            r: hexlify(request.r),
            s: hexlify(request.s)
          }
        },

        {
          value: msgValue
        }
      );

      uuid = await getUUIDFromAttestTx(res);

      break;
    }
  }

  if (!options.skipBalanceCheck) {
    const transactionCost = await getTransactionCost(res);

    expect(await getBalance(txSender.address)).to.equal(prevBalance.sub(value).sub(transactionCost));
  }

  expect(await eas.isAttestationValid(uuid)).to.be.true;

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
  request: AttestationRequest,
  options: AttestationOptions,
  err: string
) => {
  const {
    eas,
    verifier,
    eip712Utils,
    recipient,
    schema,
    expirationTime,
    revocable = true,
    refUUID = ZERO_BYTES32,
    data = ZERO_BYTES32,
    value = 0
  } = request;
  const { from: txSender, signatureType = SignatureType.Direct } = options;

  switch (signatureType) {
    case SignatureType.Direct: {
      await expect(
        eas.connect(txSender).attest(
          { recipient, schema, expirationTime, revocable, refUUID, data, value },
          {
            value: options.value ?? value
          }
        )
      ).to.be.revertedWith(err);

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils || !verifier) {
        throw new Error('Invalid verifier');
      }

      const request = await eip712Utils.signDelegatedAttestation(
        txSender,
        recipient,
        schema,
        expirationTime,
        revocable,
        refUUID,
        data,
        await verifier.getNonce(txSender.address)
      );

      expect(await eip712Utils.verifyDelegatedAttestationSignature(txSender.address, request)).to.be.true;

      await expect(
        eas.connect(txSender).attestByDelegation(
          {
            request: {
              recipient,
              schema,
              expirationTime,
              revocable,
              refUUID,
              data,
              value: 0
            },
            signature: {
              attester: txSender.address,
              v: request.v,
              r: hexlify(request.r),
              s: hexlify(request.s)
            }
          },
          { value: options.value }
        )
      ).to.be.revertedWith(err);

      break;
    }
  }
};

export const expectRevocation = async (request: RevocationRequest, options: RevocationOptions) => {
  const { eas, verifier, eip712Utils, uuid, value = 0 } = request;
  const { from: txSender, signatureType = SignatureType.Direct } = options;

  const prevBalance = await getBalance(txSender.address);

  const attestation = await eas.getAttestation(uuid);

  let res;

  switch (signatureType) {
    case SignatureType.Direct: {
      res = await eas.connect(txSender).revoke({ uuid, value }, { value: options.value ?? value });

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils || !verifier) {
        throw new Error('Invalid verifier');
      }

      const signature = await eip712Utils.signDelegatedRevocation(
        txSender,
        uuid,
        await verifier.getNonce(txSender.address)
      );

      res = await eas.connect(txSender).revokeByDelegation(
        {
          request: { uuid, value },
          signature: {
            attester: txSender.address,
            v: signature.v,
            r: hexlify(signature.r),
            s: hexlify(signature.s)
          }
        },
        { value: options.value ?? value }
      );

      break;
    }
  }

  await expect(res).to.emit(eas, 'Revoked').withArgs(attestation.recipient, txSender.address, uuid, attestation.schema);

  if (!options.skipBalanceCheck) {
    const transactionCost = await getTransactionCost(res);

    expect(await getBalance(txSender.address)).to.equal(prevBalance.sub(value).sub(transactionCost));
  }

  const attestation2 = await eas.getAttestation(uuid);
  expect(attestation2.revocationTime).to.equal(await eas.getTime());

  return res;
};

export const expectFailedRevocation = async (request: RevocationRequest, options: RevocationOptions, err: string) => {
  const { eas, verifier, eip712Utils, uuid, value = 0 } = request;
  const { from: txSender, signatureType = SignatureType.Direct } = options;

  switch (signatureType) {
    case SignatureType.Direct: {
      await expect(eas.connect(txSender).revoke({ uuid, value }, { value: options.value ?? value })).to.be.revertedWith(
        err
      );

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils || !verifier) {
        throw new Error('Invalid verifier');
      }

      const request = await eip712Utils.signDelegatedRevocation(
        txSender,
        uuid,
        await verifier.getNonce(txSender.address)
      );

      expect(await eip712Utils.verifyDelegatedRevocationSignature(txSender.address, request)).to.be.true;

      await expect(
        eas.revokeByDelegation(
          {
            request: { uuid, value },
            signature: {
              attester: txSender.address,
              v: request.v,
              r: hexlify(request.r),
              s: hexlify(request.s)
            }
          },
          { value: options.value ?? value }
        )
      ).to.be.revertedWith(err);

      break;
    }
  }
};
