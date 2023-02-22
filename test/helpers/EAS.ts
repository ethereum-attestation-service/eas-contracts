import { SchemaRegistry, SchemaResolver, TestEAS } from '../../typechain-types';
import {
  AttestationStructOutput,
  MultiDelegatedAttestationRequestStruct,
  MultiDelegatedRevocationRequestStruct
} from '../../typechain-types/contracts/IEAS';
import { ZERO_BYTES32 } from '../../utils/Constants';
import { getSchemaUID, getUIDFromAttestTx, getUIDsFromMultiAttestTx } from '../../utils/EAS';
import {
  EIP712AttestationParams,
  EIP712MessageTypes,
  EIP712Request,
  EIP712RevocationParams,
  EIP712Utils
} from './EIP712Utils';
import { getTransactionCost } from './Transaction';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, BigNumberish, ContractTransaction, utils, Wallet } from 'ethers';
import { ethers } from 'hardhat';

const { hexlify } = utils;
const {
  provider: { getBalance }
} = ethers;

export const registerSchema = async (
  schema: string,
  registry: SchemaRegistry,
  resolver: SchemaResolver | string,
  revocable: boolean
) => {
  const address = typeof resolver === 'string' ? resolver : resolver.address;
  await registry.register(schema, address, revocable);

  return getSchemaUID(schema, address, revocable);
};

export enum SignatureType {
  Direct = 'direct',
  Delegated = 'delegated'
}

export interface RequestContracts {
  eas: TestEAS;
  eip712Utils?: EIP712Utils;
}

export interface AttestationOptions {
  signatureType?: SignatureType;
  from: Wallet | SignerWithAddress;
  value?: BigNumberish;
  bump?: number;
  skipBalanceCheck?: boolean;
}

export interface AttestationRequestData {
  recipient: string;
  expirationTime: number;
  revocable?: boolean;
  refUID?: string;
  data?: any;
  value?: BigNumberish;
}

export interface MultiAttestationRequest {
  schema: string;
  requests: AttestationRequestData[];
}

export interface MultiDelegateAttestationRequest {
  schema: string;
  data: AttestationRequestData[];
  signatures: EIP712Request<EIP712MessageTypes, EIP712AttestationParams>[];
  attester: string;
}

export interface RevocationOptions {
  signatureType?: SignatureType;
  from: Wallet | SignerWithAddress;
  value?: BigNumberish;
  skipBalanceCheck?: boolean;
}

export interface RevocationRequestData {
  uid: string;
  value?: BigNumberish;
}

export interface MultiRevocationRequest {
  schema: string;
  requests: RevocationRequestData[];
}

export interface MultiDelegateRevocationRequest {
  schema: string;
  data: RevocationRequestData[];
  signatures: EIP712Request<EIP712MessageTypes, EIP712RevocationParams>[];
  attester: string;
}

export const expectAttestation = async (
  contracts: RequestContracts,
  schema: string,
  request: AttestationRequestData,
  options: AttestationOptions
) => {
  const { eas, eip712Utils } = contracts;
  const {
    recipient,
    expirationTime,
    revocable = true,
    refUID = ZERO_BYTES32,
    data = ZERO_BYTES32,
    value = 0
  } = request;
  const { from: txSender, signatureType = SignatureType.Direct } = options;

  const prevBalance = await getBalance(txSender.address);

  const msgValue = BigNumber.from(options.value ?? value);
  let uid;

  let res: ContractTransaction;

  switch (signatureType) {
    case SignatureType.Direct: {
      const args = [
        { schema, data: { recipient, expirationTime, revocable, refUID, data, value } },
        { value: msgValue }
      ] as const;

      const returnedUid = await eas.connect(txSender).callStatic.attest(...args);
      res = await eas.connect(txSender).attest(...args);

      uid = await getUIDFromAttestTx(res);
      expect(uid).to.equal(returnedUid);

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils) {
        throw new Error('Invalid verifier');
      }

      const signature = await eip712Utils.signDelegatedAttestation(
        txSender,
        schema,
        recipient,
        expirationTime,
        revocable,
        refUID,
        data,
        await eas.getNonce(txSender.address)
      );

      expect(await eip712Utils.verifyDelegatedAttestationSignature(txSender.address, signature)).to.be.true;

      const args = [
        {
          schema,
          data: { recipient, expirationTime, revocable, refUID, data, value },
          signature: {
            v: signature.v,
            r: hexlify(signature.r),
            s: hexlify(signature.s)
          },
          attester: txSender.address
        },
        {
          value: msgValue
        }
      ] as const;

      const returnedUid = await eas.connect(txSender).callStatic.attestByDelegation(...args);
      res = await eas.connect(txSender).attestByDelegation(...args);

      uid = await getUIDFromAttestTx(res);
      expect(uid).to.equal(returnedUid);

      break;
    }
  }

  if (!options.skipBalanceCheck) {
    const transactionCost = await getTransactionCost(res);

    expect(await getBalance(txSender.address)).to.equal(prevBalance.sub(value).sub(transactionCost));
  }

  await expect(res).to.emit(eas, 'Attested').withArgs(recipient, txSender.address, uid, schema);

  expect(await eas.isAttestationValid(uid)).to.be.true;

  const attestation = await eas.getAttestation(uid);
  expect(attestation.uid).to.equal(uid);
  expect(attestation.schema).to.equal(schema);
  expect(attestation.recipient).to.equal(recipient);
  expect(attestation.attester).to.equal(txSender.address);
  expect(attestation.time).to.equal(await eas.getTime());
  expect(attestation.expirationTime).to.equal(expirationTime);
  expect(attestation.revocationTime).to.equal(0);
  expect(attestation.revocable).to.equal(revocable);
  expect(attestation.refUID).to.equal(refUID);
  expect(attestation.data).to.equal(data);

  return { uid, res };
};

export const expectFailedAttestation = async (
  contracts: RequestContracts,
  schema: string,
  request: AttestationRequestData,
  options: AttestationOptions,
  err: string
) => {
  const { eas, eip712Utils } = contracts;
  const {
    recipient,
    expirationTime,
    revocable = true,
    refUID = ZERO_BYTES32,
    data = ZERO_BYTES32,
    value = 0
  } = request;
  const { from: txSender, signatureType = SignatureType.Direct } = options;

  const msgValue = BigNumber.from(options.value ?? value);

  switch (signatureType) {
    case SignatureType.Direct: {
      await expect(
        eas.connect(txSender).attest(
          { schema, data: { recipient, expirationTime, revocable, refUID, data, value } },
          {
            value: msgValue
          }
        )
      ).to.be.revertedWith(err);

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils) {
        throw new Error('Invalid verifier');
      }

      const signature = await eip712Utils.signDelegatedAttestation(
        txSender,
        schema,
        recipient,
        expirationTime,
        revocable,
        refUID,
        data,
        await eas.getNonce(txSender.address)
      );

      expect(await eip712Utils.verifyDelegatedAttestationSignature(txSender.address, signature)).to.be.true;

      await expect(
        eas.connect(txSender).attestByDelegation(
          {
            schema,
            data: {
              recipient,
              expirationTime,
              revocable,
              refUID,
              data,
              value
            },
            signature: {
              v: signature.v,
              r: hexlify(signature.r),
              s: hexlify(signature.s)
            },
            attester: txSender.address
          },
          { value: msgValue }
        )
      ).to.be.revertedWith(err);

      break;
    }
  }
};

export const expectMultiAttestations = async (
  contracts: RequestContracts,
  requests: MultiAttestationRequest[],
  options: AttestationOptions
) => {
  const { eas, eip712Utils } = contracts;

  const multiAttestationRequests = requests.map((r) => ({
    schema: r.schema,
    data: r.requests.map((d) => ({
      recipient: d.recipient,
      expirationTime: d.expirationTime,
      revocable: d.revocable ?? true,
      refUID: d.refUID ?? ZERO_BYTES32,
      data: d.data ?? ZERO_BYTES32,
      value: d.value ?? 0
    }))
  }));

  const { from: txSender, signatureType = SignatureType.Direct } = options;

  const prevBalance = await getBalance(txSender.address);

  const requestedValue = multiAttestationRequests.reduce((res, { data }) => {
    const total = data.reduce((res, r) => res.add(r.value), BigNumber.from(0));
    return res.add(total);
  }, BigNumber.from(0));
  const msgValue = options.value ?? requestedValue;

  let uids: string[] = [];
  let res: ContractTransaction;

  switch (signatureType) {
    case SignatureType.Direct: {
      const args = [
        multiAttestationRequests,
        {
          value: msgValue
        }
      ] as const;

      const returnedUids = await eas.connect(txSender).callStatic.multiAttest(...args);
      res = await eas.connect(txSender).multiAttest(...args);

      uids = await getUIDsFromMultiAttestTx(res);
      expect(uids).to.deep.equal(returnedUids);

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils) {
        throw new Error('Invalid verifier');
      }

      const multiDelegatedAttestationRequests: MultiDelegatedAttestationRequestStruct[] = [];

      let nonce = await eas.getNonce(txSender.address);

      for (const { schema, data } of multiAttestationRequests) {
        const signatures: EIP712Request<EIP712MessageTypes, EIP712AttestationParams>[] = [];

        for (const request of data) {
          const signature = await eip712Utils.signDelegatedAttestation(
            txSender,
            schema,
            request.recipient,
            request.expirationTime,
            request.revocable,
            request.refUID,
            request.data,
            nonce
          );

          expect(await eip712Utils.verifyDelegatedAttestationSignature(txSender.address, signature)).to.be.true;

          signatures.push(signature);

          nonce = nonce.add(1);
        }

        multiDelegatedAttestationRequests.push({ schema, data, signatures, attester: txSender.address });
      }

      const args = [multiDelegatedAttestationRequests, { value: msgValue }] as const;

      const returnedUids = await eas.connect(txSender).callStatic.multiAttestByDelegation(...args);
      res = await eas.connect(txSender).multiAttestByDelegation(...args);

      uids = await getUIDsFromMultiAttestTx(res);
      expect(uids).to.deep.equal(returnedUids);

      break;
    }
  }

  if (!options.skipBalanceCheck) {
    const transactionCost = await getTransactionCost(res);

    expect(await getBalance(txSender.address)).to.equal(prevBalance.sub(requestedValue).sub(transactionCost));
  }

  let i = 0;
  for (const { schema, data } of multiAttestationRequests) {
    for (const request of data) {
      const uid = uids[i++];

      await expect(res).to.emit(eas, 'Attested').withArgs(request.recipient, txSender.address, uid, schema);

      expect(await eas.isAttestationValid(uid)).to.be.true;

      const attestation = await eas.getAttestation(uid);
      expect(attestation.uid).to.equal(uid);
      expect(attestation.schema).to.equal(schema);
      expect(attestation.recipient).to.equal(request.recipient);
      expect(attestation.attester).to.equal(txSender.address);
      expect(attestation.time).to.equal(await eas.getTime());
      expect(attestation.expirationTime).to.equal(request.expirationTime);
      expect(attestation.revocationTime).to.equal(0);
      expect(attestation.revocable).to.equal(request.revocable);
      expect(attestation.refUID).to.equal(request.refUID);
      expect(attestation.data).to.equal(request.data);
    }
  }

  return { uids, res };
};

export const expectFailedMultiAttestations = async (
  contracts: RequestContracts,
  requests: MultiAttestationRequest[],
  options: AttestationOptions,
  err: string
) => {
  const { eas, eip712Utils } = contracts;

  const { from: txSender, signatureType = SignatureType.Direct } = options;

  const multiAttestationRequests = requests.map((r) => ({
    schema: r.schema,
    data: r.requests.map((d) => ({
      recipient: d.recipient,
      expirationTime: d.expirationTime,
      revocable: d.revocable ?? true,
      refUID: d.refUID ?? ZERO_BYTES32,
      data: d.data ?? ZERO_BYTES32,
      value: d.value ?? 0
    }))
  }));

  const msgValue =
    options.value ??
    multiAttestationRequests.reduce((res, { data }) => {
      const total = data.reduce((res, r) => res.add(r.value), BigNumber.from(0));

      return res.add(total);
    }, BigNumber.from(0));

  switch (signatureType) {
    case SignatureType.Direct: {
      await expect(
        eas.connect(txSender).multiAttest(multiAttestationRequests, {
          value: msgValue
        })
      ).to.be.revertedWith(err);

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils) {
        throw new Error('Invalid verifier');
      }

      const multiDelegatedAttestationRequests: MultiDelegatedAttestationRequestStruct[] = [];

      let nonce = await eas.getNonce(txSender.address);

      for (const { schema, data } of multiAttestationRequests) {
        const signatures: EIP712Request<EIP712MessageTypes, EIP712AttestationParams>[] = [];

        for (const request of data) {
          const signature = await eip712Utils.signDelegatedAttestation(
            txSender,
            schema,
            request.recipient,
            request.expirationTime,
            request.revocable,
            request.refUID,
            request.data,
            nonce
          );

          expect(await eip712Utils.verifyDelegatedAttestationSignature(txSender.address, signature)).to.be.true;

          signatures.push(signature);

          nonce = nonce.add(1);
        }

        multiDelegatedAttestationRequests.push({ schema, data, signatures, attester: txSender.address });
      }

      await expect(
        eas.connect(txSender).multiAttestByDelegation(multiDelegatedAttestationRequests, { value: msgValue })
      ).to.be.revertedWith(err);

      break;
    }
  }
};

export const expectRevocation = async (
  contracts: RequestContracts,
  schema: string,
  request: RevocationRequestData,
  options: RevocationOptions
) => {
  const { eas, eip712Utils } = contracts;
  const { uid, value = 0 } = request;
  const { from: txSender, signatureType = SignatureType.Direct } = options;

  const msgValue = BigNumber.from(options.value ?? value);

  const prevBalance = await getBalance(txSender.address);
  const attestation = await eas.getAttestation(uid);

  let res;

  switch (signatureType) {
    case SignatureType.Direct: {
      res = await eas.connect(txSender).revoke({ schema, data: { uid, value } }, { value: msgValue });

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils) {
        throw new Error('Invalid verifier');
      }

      const signature = await eip712Utils.signDelegatedRevocation(
        txSender,
        schema,
        uid,
        await eas.getNonce(txSender.address)
      );

      res = await eas.connect(txSender).revokeByDelegation(
        {
          schema,
          data: { uid, value },
          signature: {
            v: signature.v,
            r: hexlify(signature.r),
            s: hexlify(signature.s)
          },
          revoker: txSender.address
        },
        { value: msgValue }
      );

      break;
    }
  }

  if (!options.skipBalanceCheck) {
    const transactionCost = await getTransactionCost(res);

    expect(await getBalance(txSender.address)).to.equal(prevBalance.sub(value).sub(transactionCost));
  }

  await expect(res).to.emit(eas, 'Revoked').withArgs(attestation.recipient, txSender.address, uid, attestation.schema);

  const attestation2 = await eas.getAttestation(uid);
  expect(attestation2.revocationTime).to.equal(await eas.getTime());

  return res;
};

export const expectMultiRevocations = async (
  contracts: RequestContracts,
  requests: MultiRevocationRequest[],
  options: RevocationOptions
) => {
  const { eas, eip712Utils } = contracts;

  const multiRevocationRequests = requests.map((r) => ({
    schema: r.schema,
    data: r.requests.map((d) => ({
      uid: d.uid,
      value: d.value ?? 0
    }))
  }));

  const { from: txSender, signatureType = SignatureType.Direct } = options;

  const prevBalance = await getBalance(txSender.address);
  const attestations: Record<string, AttestationStructOutput> = {};
  for (const data of requests) {
    for (const request of data.requests) {
      attestations[request.uid] = await eas.getAttestation(request.uid);
    }
  }

  const requestedValue = multiRevocationRequests.reduce((res, { data }) => {
    const total = data.reduce((res, r) => res.add(r.value), BigNumber.from(0));

    return res.add(total);
  }, BigNumber.from(0));
  const msgValue = options.value ?? requestedValue;

  let res: ContractTransaction;

  switch (signatureType) {
    case SignatureType.Direct: {
      res = await eas.connect(txSender).multiRevoke(multiRevocationRequests, {
        value: msgValue
      });

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils) {
        throw new Error('Invalid verifier');
      }

      const multiDelegatedRevocationRequests: MultiDelegatedRevocationRequestStruct[] = [];

      let nonce = await eas.getNonce(txSender.address);

      for (const { schema, data } of multiRevocationRequests) {
        const signatures: EIP712Request<EIP712MessageTypes, EIP712RevocationParams>[] = [];

        for (const request of data) {
          const signature = await eip712Utils.signDelegatedRevocation(txSender, schema, request.uid, nonce);

          expect(await eip712Utils.verifyDelegatedRevocationSignature(txSender.address, signature)).to.be.true;

          signatures.push(signature);

          nonce = nonce.add(1);
        }

        multiDelegatedRevocationRequests.push({ schema, data, signatures, revoker: txSender.address });
      }

      res = await eas.connect(txSender).multiRevokeByDelegation(multiDelegatedRevocationRequests, { value: msgValue });

      break;
    }
  }

  if (!options.skipBalanceCheck) {
    const transactionCost = await getTransactionCost(res);

    expect(await getBalance(txSender.address)).to.equal(prevBalance.sub(requestedValue).sub(transactionCost));
  }

  for (const data of requests) {
    for (const request of data.requests) {
      const attestation = attestations[request.uid];
      await expect(res)
        .to.emit(eas, 'Revoked')
        .withArgs(attestation.recipient, txSender.address, request.uid, attestation.schema);

      expect(await eas.isAttestationValid(request.uid)).to.be.true;

      const attestation2 = await eas.getAttestation(request.uid);
      expect(attestation2.revocationTime).to.equal(await eas.getTime());
    }
  }

  return res;
};

export const expectFailedRevocation = async (
  contracts: RequestContracts,
  schema: string,
  request: RevocationRequestData,
  options: RevocationOptions,
  err: string
) => {
  const { eas, eip712Utils } = contracts;
  const { uid, value = 0 } = request;
  const { from: txSender, signatureType = SignatureType.Direct } = options;

  const msgValue = options.value ?? value;

  switch (signatureType) {
    case SignatureType.Direct: {
      await expect(
        eas.connect(txSender).revoke({ schema, data: { uid, value } }, { value: msgValue })
      ).to.be.revertedWith(err);

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils) {
        throw new Error('Invalid verifier');
      }

      const signature = await eip712Utils.signDelegatedRevocation(
        txSender,
        schema,
        uid,
        await eas.getNonce(txSender.address)
      );

      expect(await eip712Utils.verifyDelegatedRevocationSignature(txSender.address, signature)).to.be.true;

      await expect(
        eas.revokeByDelegation(
          {
            schema,
            data: { uid, value },
            signature: {
              v: signature.v,
              r: hexlify(signature.r),
              s: hexlify(signature.s)
            },
            revoker: txSender.address
          },
          { value: msgValue }
        )
      ).to.be.revertedWith(err);

      break;
    }
  }
};

export const expectFailedMultiRevocations = async (
  contracts: RequestContracts,
  requests: MultiRevocationRequest[],
  options: RevocationOptions,
  err: string
) => {
  const { eas, eip712Utils } = contracts;
  const { from: txSender, signatureType = SignatureType.Direct } = options;

  const multiRevocationRequests = requests.map((r) => ({
    schema: r.schema,
    data: r.requests.map((d) => ({
      uid: d.uid,
      value: d.value ?? 0
    }))
  }));

  const msgValue =
    options.value ??
    multiRevocationRequests.reduce((res, { data }) => {
      const total = data.reduce((res, r) => res.add(r.value), BigNumber.from(0));
      return res.add(total);
    }, BigNumber.from(0));

  switch (signatureType) {
    case SignatureType.Direct: {
      await expect(
        eas.connect(txSender).multiRevoke(multiRevocationRequests, {
          value: msgValue
        })
      ).to.be.revertedWith(err);

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils) {
        throw new Error('Invalid verifier');
      }

      const multiDelegatedRevocationRequests: MultiDelegatedRevocationRequestStruct[] = [];

      let nonce = await eas.getNonce(txSender.address);

      for (const { schema, data } of multiRevocationRequests) {
        const signatures: EIP712Request<EIP712MessageTypes, EIP712RevocationParams>[] = [];

        for (const request of data) {
          const signature = await eip712Utils.signDelegatedRevocation(txSender, schema, request.uid, nonce);

          expect(await eip712Utils.verifyDelegatedRevocationSignature(txSender.address, signature)).to.be.true;

          signatures.push(signature);

          nonce = nonce.add(1);
        }

        multiDelegatedRevocationRequests.push({ schema, data, signatures, revoker: txSender.address });
      }

      await expect(
        eas.connect(txSender).multiRevokeByDelegation(multiDelegatedRevocationRequests, { value: msgValue })
      ).to.be.revertedWith(err);

      break;
    }
  }
};
