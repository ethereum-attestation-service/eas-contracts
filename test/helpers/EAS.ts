import { expect } from 'chai';
import { BaseContract, hexlify, Signer, TransactionResponse } from 'ethers';
import { SchemaRegistry, SchemaResolver, TestEAS } from '../../typechain-types';
import {
  MultiDelegatedProxyAttestationRequestStruct,
  MultiDelegatedProxyRevocationRequestStruct
} from '../../typechain-types/contracts/eip712/proxy/EIP712Proxy';
import {
  AttestationStructOutput,
  MultiDelegatedAttestationRequestStruct,
  MultiDelegatedRevocationRequestStruct
} from '../../typechain-types/contracts/IEAS';
import { NO_EXPIRATION, ZERO_BYTES32 } from '../../utils/Constants';
import {
  getSchemaUID,
  getUIDFromAttestTx,
  getUIDFromDelegatedProxyAttestTx,
  getUIDFromMultiDelegatedProxyAttestTx,
  getUIDsFromMultiAttestTx
} from '../../utils/EAS';
import { EIP712ProxyUtils } from './EIP712ProxyUtils';
import {
  EIP712AttestationParams,
  EIP712MessageTypes,
  EIP712Request,
  EIP712RevocationParams,
  EIP712Utils
} from './EIP712Utils';
import { getTransactionCost } from './Transaction';
import { getBalance } from './Wallet';

export const registerSchema = async (
  schema: string,
  registry: SchemaRegistry,
  resolver: SchemaResolver | string,
  revocable: boolean
) => {
  const address = typeof resolver === 'string' ? resolver : await resolver.getAddress();
  await registry.register(schema, address, revocable);

  return getSchemaUID(schema, address, revocable);
};

export enum SignatureType {
  Direct = 'direct',
  Delegated = 'delegated',
  DelegatedProxy = 'delegated-proxy'
}

export interface RequestContracts {
  eas: TestEAS;
  eip712Utils?: EIP712Utils;
  eip712ProxyUtils?: EIP712ProxyUtils;
}

export interface AttestationOptions {
  signatureType?: SignatureType;
  from: Signer;
  deadline?: bigint;
  value?: bigint;
  bump?: number;
  skipBalanceCheck?: boolean;
}

export interface AttestationRequestData {
  recipient: string;
  expirationTime: bigint;
  revocable?: boolean;
  refUID?: string;
  data?: any;
  value?: bigint;
}

export interface MultiAttestationRequest {
  schema: string;
  requests: AttestationRequestData[];
}

export interface RevocationOptions {
  signatureType?: SignatureType;
  from: Signer;
  deadline?: bigint;
  value?: bigint;
  skipBalanceCheck?: boolean;
}

export interface RevocationRequestData {
  uid: string;
  value?: bigint;
}

export interface MultiRevocationRequest {
  schema: string;
  requests: RevocationRequestData[];
}

export const expectAttestation = async (
  contracts: RequestContracts,
  schema: string,
  request: AttestationRequestData,
  options: AttestationOptions
) => {
  const { eas, eip712Utils, eip712ProxyUtils } = contracts;
  const {
    recipient,
    expirationTime,
    revocable = true,
    refUID = ZERO_BYTES32,
    data = ZERO_BYTES32,
    value = 0n
  } = request;
  const { from: txSender, signatureType = SignatureType.Direct, deadline = NO_EXPIRATION } = options;

  const prevBalance: bigint = await getBalance(await txSender.getAddress());

  const msgValue = options.value ?? value;
  let uid;

  let res: TransactionResponse;

  switch (signatureType) {
    case SignatureType.Direct: {
      const args = [
        { schema, data: { recipient, expirationTime, revocable, refUID, data, value } },
        { value: msgValue }
      ] as const;

      const returnedUid = await eas.connect(txSender).attest.staticCall(...args);
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
        await eas.getNonce(await txSender.getAddress())
      );

      expect(await eip712Utils.verifyDelegatedAttestationSignature(await txSender.getAddress(), signature)).to.be.true;

      const args = [
        {
          schema,
          data: { recipient, expirationTime, revocable, refUID, data, value },
          signature: {
            v: signature.v,
            r: hexlify(signature.r),
            s: hexlify(signature.s)
          },
          attester: await txSender.getAddress()
        },
        {
          value: msgValue
        }
      ] as const;

      const returnedUid = await eas.connect(txSender).attestByDelegation.staticCall(...args);
      res = await eas.connect(txSender).attestByDelegation(...args);

      uid = await getUIDFromAttestTx(res);
      expect(uid).to.equal(returnedUid);

      break;
    }

    case SignatureType.DelegatedProxy: {
      if (!eip712ProxyUtils) {
        throw new Error('Invalid proxy');
      }

      const signature = await eip712ProxyUtils.signDelegatedProxyAttestation(
        txSender,
        schema,
        recipient,
        expirationTime,
        revocable,
        refUID,
        data,
        deadline
      );

      expect(await eip712ProxyUtils.verifyDelegatedProxyAttestationSignature(await txSender.getAddress(), signature)).to
        .be.true;

      const args = [
        {
          schema,
          data: { recipient, expirationTime, revocable, refUID, data, value },
          signature: {
            v: signature.v,
            r: hexlify(signature.r),
            s: hexlify(signature.s)
          },
          attester: await txSender.getAddress(),
          deadline
        },
        {
          value: msgValue
        }
      ] as const;

      const returnedUid = await eip712ProxyUtils.proxy.connect(txSender).attestByDelegation.staticCall(...args);
      res = await eip712ProxyUtils.proxy.connect(txSender).attestByDelegation(...args);

      uid = await getUIDFromDelegatedProxyAttestTx(res);
      expect(uid).to.equal(returnedUid);

      expect(await eip712ProxyUtils.proxy.getAttester(uid)).to.equal(await txSender.getAddress());

      break;
    }
  }

  if (!options.skipBalanceCheck) {
    const transactionCost = await getTransactionCost(res);

    expect(await getBalance(await txSender.getAddress())).to.equal(prevBalance - value - transactionCost);
  }

  const attester =
    signatureType !== SignatureType.DelegatedProxy
      ? await txSender.getAddress()
      : await eip712ProxyUtils?.proxy.getAddress();

  await expect(res).to.emit(eas, 'Attested').withArgs(recipient, attester, uid, schema);

  expect(await eas.isAttestationValid(uid)).to.be.true;

  const attestation = await eas.getAttestation(uid);
  expect(attestation.uid).to.equal(uid);
  expect(attestation.schema).to.equal(schema);
  expect(attestation.recipient).to.equal(recipient);
  expect(attestation.attester).to.equal(attester);
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
  err: string,
  contract?: BaseContract
) => {
  const { eas, eip712Utils, eip712ProxyUtils } = contracts;
  const {
    recipient,
    expirationTime,
    revocable = true,
    refUID = ZERO_BYTES32,
    data = ZERO_BYTES32,
    value = 0n
  } = request;
  const { from: txSender, signatureType = SignatureType.Direct, deadline = NO_EXPIRATION } = options;

  const msgValue = options.value ?? value;

  switch (signatureType) {
    case SignatureType.Direct: {
      await expect(
        eas.connect(txSender).attest(
          { schema, data: { recipient, expirationTime, revocable, refUID, data, value } },
          {
            value: msgValue
          }
        )
      ).to.be.revertedWithCustomError(contract ?? eas, err);

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
        await eas.getNonce(await txSender.getAddress())
      );

      expect(await eip712Utils.verifyDelegatedAttestationSignature(await txSender.getAddress(), signature)).to.be.true;

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
            attester: await txSender.getAddress()
          },
          { value: msgValue }
        )
      ).to.be.revertedWithCustomError(contract ?? eas, err);

      break;
    }

    case SignatureType.DelegatedProxy: {
      if (!eip712ProxyUtils) {
        throw new Error('Invalid proxy');
      }

      const signature = await eip712ProxyUtils.signDelegatedProxyAttestation(
        txSender,
        schema,
        recipient,
        expirationTime,
        revocable,
        refUID,
        data,
        deadline
      );

      expect(await eip712ProxyUtils.verifyDelegatedProxyAttestationSignature(await txSender.getAddress(), signature)).to
        .be.true;

      await expect(
        eip712ProxyUtils.proxy.connect(txSender).attestByDelegation(
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
            attester: await txSender.getAddress(),
            deadline
          },
          { value: msgValue }
        )
      ).to.be.revertedWithCustomError(contract ?? eas, err);

      break;
    }
  }
};

export const expectMultiAttestations = async (
  contracts: RequestContracts,
  requests: MultiAttestationRequest[],
  options: AttestationOptions
) => {
  const { eas, eip712Utils, eip712ProxyUtils } = contracts;

  const multiAttestationRequests = requests.map((r) => ({
    schema: r.schema,
    data: r.requests.map((d) => ({
      recipient: d.recipient,
      expirationTime: d.expirationTime,
      revocable: d.revocable ?? true,
      refUID: d.refUID ?? ZERO_BYTES32,
      data: d.data ?? ZERO_BYTES32,
      value: d.value ?? 0n
    }))
  }));

  const { from: txSender, signatureType = SignatureType.Direct, deadline = NO_EXPIRATION } = options;

  const prevBalance: bigint = await getBalance(await txSender.getAddress());

  const requestedValue = multiAttestationRequests.reduce((res, { data }) => {
    const total = data.reduce((res, r) => res + r.value, 0n);
    return res + total;
  }, 0n);
  const msgValue = options.value ?? requestedValue;

  let uids: string[] = [];
  let res: TransactionResponse;

  switch (signatureType) {
    case SignatureType.Direct: {
      const args = [
        multiAttestationRequests,
        {
          value: msgValue
        }
      ] as const;

      const returnedUids = await eas.connect(txSender).multiAttest.staticCall(...args);
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

      let nonce = await eas.getNonce(await txSender.getAddress());

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

          expect(await eip712Utils.verifyDelegatedAttestationSignature(await txSender.getAddress(), signature)).to.be
            .true;

          signatures.push(signature);

          nonce++;
        }

        multiDelegatedAttestationRequests.push({ schema, data, signatures, attester: await txSender.getAddress() });
      }

      const args = [multiDelegatedAttestationRequests, { value: msgValue }] as const;

      const returnedUids = await eas.connect(txSender).multiAttestByDelegation.staticCall(...args);
      res = await eas.connect(txSender).multiAttestByDelegation(...args);

      uids = await getUIDsFromMultiAttestTx(res);
      expect(uids).to.deep.equal(returnedUids);

      break;
    }

    case SignatureType.DelegatedProxy: {
      if (!eip712ProxyUtils) {
        throw new Error('Invalid proxy');
      }

      const multiDelegatedAttestationRequests: MultiDelegatedProxyAttestationRequestStruct[] = [];

      for (const { schema, data } of multiAttestationRequests) {
        const signatures: EIP712Request<EIP712MessageTypes, EIP712AttestationParams>[] = [];

        for (const request of data) {
          const signature = await eip712ProxyUtils.signDelegatedProxyAttestation(
            txSender,
            schema,
            request.recipient,
            request.expirationTime,
            request.revocable,
            request.refUID,
            request.data,
            deadline
          );

          expect(
            await eip712ProxyUtils.verifyDelegatedProxyAttestationSignature(await txSender.getAddress(), signature)
          ).to.be.true;

          signatures.push(signature);
        }

        multiDelegatedAttestationRequests.push({
          schema,
          data,
          signatures,
          attester: await txSender.getAddress(),
          deadline
        });
      }

      const args = [multiDelegatedAttestationRequests, { value: msgValue }] as const;

      const returnedUids = await eip712ProxyUtils.proxy.connect(txSender).multiAttestByDelegation.staticCall(...args);
      res = await eip712ProxyUtils.proxy.connect(txSender).multiAttestByDelegation(...args);

      uids = await getUIDFromMultiDelegatedProxyAttestTx(res);
      expect(uids).to.deep.equal(returnedUids);

      for (const uid of uids) {
        expect(await eip712ProxyUtils.proxy.getAttester(uid)).to.equal(await txSender.getAddress());
      }

      break;
    }
  }

  if (!options.skipBalanceCheck) {
    const transactionCost = await getTransactionCost(res);

    expect(await getBalance(await txSender.getAddress())).to.equal(prevBalance - requestedValue - transactionCost);
  }

  let i = 0;
  for (const { schema, data } of multiAttestationRequests) {
    for (const request of data) {
      const uid = uids[i++];

      const attester =
        signatureType !== SignatureType.DelegatedProxy
          ? await txSender.getAddress()
          : await eip712ProxyUtils?.proxy.getAddress();

      await expect(res).to.emit(eas, 'Attested').withArgs(request.recipient, attester, uid, schema);

      expect(await eas.isAttestationValid(uid)).to.be.true;

      const attestation = await eas.getAttestation(uid);
      expect(attestation.uid).to.equal(uid);
      expect(attestation.schema).to.equal(schema);
      expect(attestation.recipient).to.equal(request.recipient);
      expect(attestation.attester).to.equal(attester);
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
  err: string,
  contract?: BaseContract
) => {
  const { eas, eip712Utils, eip712ProxyUtils } = contracts;

  const { from: txSender, signatureType = SignatureType.Direct, deadline = NO_EXPIRATION } = options;

  const multiAttestationRequests = requests.map((r) => ({
    schema: r.schema,
    data: r.requests.map((d) => ({
      recipient: d.recipient,
      expirationTime: d.expirationTime,
      revocable: d.revocable ?? true,
      refUID: d.refUID ?? ZERO_BYTES32,
      data: d.data ?? ZERO_BYTES32,
      value: d.value ?? 0n
    }))
  }));

  const msgValue =
    options.value ??
    multiAttestationRequests.reduce((res, { data }) => {
      const total = data.reduce((res, r) => res + r.value, 0n);

      return res + total;
    }, 0n);

  switch (signatureType) {
    case SignatureType.Direct: {
      await expect(
        eas.connect(txSender).multiAttest(multiAttestationRequests, {
          value: msgValue
        })
      ).to.be.revertedWithCustomError(contract ?? eas, err);

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils) {
        throw new Error('Invalid verifier');
      }

      const multiDelegatedAttestationRequests: MultiDelegatedAttestationRequestStruct[] = [];

      let nonce = await eas.getNonce(await txSender.getAddress());

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

          expect(await eip712Utils.verifyDelegatedAttestationSignature(await txSender.getAddress(), signature)).to.be
            .true;

          signatures.push(signature);

          nonce++;
        }

        multiDelegatedAttestationRequests.push({ schema, data, signatures, attester: await txSender.getAddress() });
      }

      await expect(
        eas.connect(txSender).multiAttestByDelegation(multiDelegatedAttestationRequests, { value: msgValue })
      ).to.be.revertedWithCustomError(contract ?? eas, err);

      break;
    }

    case SignatureType.DelegatedProxy: {
      if (!eip712ProxyUtils) {
        throw new Error('Invalid proxy');
      }

      const multiDelegatedAttestationRequests: MultiDelegatedProxyAttestationRequestStruct[] = [];

      for (const { schema, data } of multiAttestationRequests) {
        const signatures: EIP712Request<EIP712MessageTypes, EIP712AttestationParams>[] = [];

        for (const request of data) {
          const signature = await eip712ProxyUtils.signDelegatedProxyAttestation(
            txSender,
            schema,
            request.recipient,
            request.expirationTime,
            request.revocable,
            request.refUID,
            request.data,
            deadline
          );

          expect(
            await eip712ProxyUtils.verifyDelegatedProxyAttestationSignature(await txSender.getAddress(), signature)
          ).to.be.true;

          signatures.push(signature);
        }

        multiDelegatedAttestationRequests.push({
          schema,
          data,
          signatures,
          attester: await txSender.getAddress(),
          deadline
        });
      }

      await expect(
        eip712ProxyUtils.proxy
          .connect(txSender)
          .multiAttestByDelegation(multiDelegatedAttestationRequests, { value: msgValue })
      ).to.be.revertedWithCustomError(contract ?? eas, err);

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
  const { eas, eip712Utils, eip712ProxyUtils } = contracts;
  const { uid, value = 0n } = request;
  const { from: txSender, signatureType = SignatureType.Direct, deadline = NO_EXPIRATION } = options;

  const msgValue = options.value ?? value;

  const prevBalance: bigint = await getBalance(await txSender.getAddress());

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
        await eas.getNonce(await txSender.getAddress())
      );

      expect(await eip712Utils.verifyDelegatedRevocationSignature(await txSender.getAddress(), signature)).to.be.true;

      res = await eas.connect(txSender).revokeByDelegation(
        {
          schema,
          data: { uid, value },
          signature: {
            v: signature.v,
            r: hexlify(signature.r),
            s: hexlify(signature.s)
          },
          revoker: await txSender.getAddress()
        },
        { value: msgValue }
      );

      break;
    }

    case SignatureType.DelegatedProxy: {
      if (!eip712ProxyUtils) {
        throw new Error('Invalid proxy');
      }

      const signature = await eip712ProxyUtils.signDelegatedProxyRevocation(txSender, schema, uid, deadline);

      expect(await eip712ProxyUtils.verifyDelegatedProxyRevocationSignature(await txSender.getAddress(), signature)).to
        .be.true;

      res = await eip712ProxyUtils.proxy.connect(txSender).revokeByDelegation(
        {
          schema,
          data: { uid, value },
          signature: {
            v: signature.v,
            r: hexlify(signature.r),
            s: hexlify(signature.s)
          },
          revoker: await txSender.getAddress(),
          deadline
        },
        { value: msgValue }
      );

      break;
    }
  }

  if (!options.skipBalanceCheck) {
    const transactionCost = await getTransactionCost(res);

    expect(await getBalance(await txSender.getAddress())).to.equal(prevBalance - value - transactionCost);
  }

  const attester =
    signatureType !== SignatureType.DelegatedProxy
      ? await txSender.getAddress()
      : await eip712ProxyUtils?.proxy.getAddress();
  await expect(res).to.emit(eas, 'Revoked').withArgs(attestation.recipient, attester, uid, attestation.schema);

  const attestation2 = await eas.getAttestation(uid);
  expect(attestation2.revocationTime).to.equal(await eas.getTime());

  return res;
};

export const expectMultiRevocations = async (
  contracts: RequestContracts,
  requests: MultiRevocationRequest[],
  options: RevocationOptions
) => {
  const { eas, eip712Utils, eip712ProxyUtils } = contracts;

  const multiRevocationRequests = requests.map((r) => ({
    schema: r.schema,
    data: r.requests.map((d) => ({
      uid: d.uid,
      value: d.value ?? 0n
    }))
  }));

  const { from: txSender, signatureType = SignatureType.Direct, deadline = NO_EXPIRATION } = options;

  const prevBalance: bigint = await getBalance(await txSender.getAddress());
  const attestations: Record<string, AttestationStructOutput> = {};
  for (const data of requests) {
    for (const request of data.requests) {
      attestations[request.uid] = await eas.getAttestation(request.uid);
    }
  }

  const requestedValue = multiRevocationRequests.reduce((res, { data }) => {
    const total = data.reduce((res, r) => res + r.value, 0n);

    return res + total;
  }, 0n);
  const msgValue = options.value ?? requestedValue;

  let res: TransactionResponse;

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

      let nonce = await eas.getNonce(await txSender.getAddress());

      for (const { schema, data } of multiRevocationRequests) {
        const signatures: EIP712Request<EIP712MessageTypes, EIP712RevocationParams>[] = [];

        for (const request of data) {
          const signature = await eip712Utils.signDelegatedRevocation(txSender, schema, request.uid, nonce);

          expect(await eip712Utils.verifyDelegatedRevocationSignature(await txSender.getAddress(), signature)).to.be
            .true;

          signatures.push(signature);

          nonce++;
        }

        multiDelegatedRevocationRequests.push({ schema, data, signatures, revoker: await txSender.getAddress() });
      }

      res = await eas.connect(txSender).multiRevokeByDelegation(multiDelegatedRevocationRequests, { value: msgValue });

      break;
    }

    case SignatureType.DelegatedProxy: {
      if (!eip712ProxyUtils) {
        throw new Error('Invalid proxy');
      }

      const multiDelegatedRevocationRequests: MultiDelegatedProxyRevocationRequestStruct[] = [];

      for (const { schema, data } of multiRevocationRequests) {
        const signatures: EIP712Request<EIP712MessageTypes, EIP712RevocationParams>[] = [];

        for (const request of data) {
          const signature = await eip712ProxyUtils.signDelegatedProxyRevocation(
            txSender,
            schema,
            request.uid,
            deadline
          );

          expect(await eip712ProxyUtils.verifyDelegatedProxyRevocationSignature(await txSender.getAddress(), signature))
            .to.be.true;

          signatures.push(signature);
        }

        multiDelegatedRevocationRequests.push({
          schema,
          data,
          signatures,
          revoker: await txSender.getAddress(),
          deadline
        });
      }

      res = await eip712ProxyUtils.proxy
        .connect(txSender)
        .multiRevokeByDelegation(multiDelegatedRevocationRequests, { value: msgValue });

      break;
    }
  }

  if (!options.skipBalanceCheck) {
    const transactionCost = await getTransactionCost(res);

    expect(await getBalance(await txSender.getAddress())).to.equal(prevBalance - requestedValue - transactionCost);
  }

  const attester =
    signatureType !== SignatureType.DelegatedProxy
      ? await txSender.getAddress()
      : await eip712ProxyUtils?.proxy.getAddress();

  for (const data of requests) {
    for (const request of data.requests) {
      const attestation = attestations[request.uid];
      await expect(res)
        .to.emit(eas, 'Revoked')
        .withArgs(attestation.recipient, attester, request.uid, attestation.schema);

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
  err: string,
  contract?: BaseContract
) => {
  const { eas, eip712Utils, eip712ProxyUtils } = contracts;
  const { uid, value = 0 } = request;
  const { from: txSender, signatureType = SignatureType.Direct, deadline = NO_EXPIRATION } = options;

  const msgValue = options.value ?? value;

  switch (signatureType) {
    case SignatureType.Direct: {
      await expect(
        eas.connect(txSender).revoke({ schema, data: { uid, value } }, { value: msgValue })
      ).to.be.revertedWithCustomError(contract ?? eas, err);

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
        await eas.getNonce(await txSender.getAddress())
      );

      expect(await eip712Utils.verifyDelegatedRevocationSignature(await txSender.getAddress(), signature)).to.be.true;

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
            revoker: await txSender.getAddress()
          },
          { value: msgValue }
        )
      ).to.be.revertedWithCustomError(contract ?? eas, err);

      break;
    }

    case SignatureType.DelegatedProxy: {
      if (!eip712ProxyUtils) {
        throw new Error('Invalid proxy');
      }

      const signature = await eip712ProxyUtils.signDelegatedProxyRevocation(txSender, schema, uid, deadline);

      expect(await eip712ProxyUtils.verifyDelegatedProxyRevocationSignature(await txSender.getAddress(), signature)).to
        .be.true;

      await expect(
        eip712ProxyUtils.proxy.connect(txSender).revokeByDelegation(
          {
            schema,
            data: { uid, value },
            signature: {
              v: signature.v,
              r: hexlify(signature.r),
              s: hexlify(signature.s)
            },
            revoker: await txSender.getAddress(),
            deadline
          },
          { value: msgValue }
        )
      ).to.be.revertedWithCustomError(contract ?? eas, err);

      break;
    }
  }
};

export const expectFailedMultiRevocations = async (
  contracts: RequestContracts,
  requests: MultiRevocationRequest[],
  options: RevocationOptions,
  err: string,
  contract?: BaseContract
) => {
  const { eas, eip712Utils, eip712ProxyUtils } = contracts;
  const { from: txSender, signatureType = SignatureType.Direct, deadline = NO_EXPIRATION } = options;

  const multiRevocationRequests = requests.map((r) => ({
    schema: r.schema,
    data: r.requests.map((d) => ({
      uid: d.uid,
      value: d.value ?? 0n
    }))
  }));

  const msgValue =
    options.value ??
    multiRevocationRequests.reduce((res, { data }) => {
      const total = data.reduce((res, r) => res + r.value, 0n);
      return res + total;
    }, 0n);

  switch (signatureType) {
    case SignatureType.Direct: {
      await expect(
        eas.connect(txSender).multiRevoke(multiRevocationRequests, {
          value: msgValue
        })
      ).to.be.revertedWithCustomError(contract ?? eas, err);

      break;
    }

    case SignatureType.Delegated: {
      if (!eip712Utils) {
        throw new Error('Invalid verifier');
      }

      const multiDelegatedRevocationRequests: MultiDelegatedRevocationRequestStruct[] = [];

      let nonce = await eas.getNonce(await txSender.getAddress());

      for (const { schema, data } of multiRevocationRequests) {
        const signatures: EIP712Request<EIP712MessageTypes, EIP712RevocationParams>[] = [];

        for (const request of data) {
          const signature = await eip712Utils.signDelegatedRevocation(txSender, schema, request.uid, nonce);

          expect(await eip712Utils.verifyDelegatedRevocationSignature(await txSender.getAddress(), signature)).to.be
            .true;

          signatures.push(signature);

          nonce++;
        }

        multiDelegatedRevocationRequests.push({ schema, data, signatures, revoker: await txSender.getAddress() });
      }

      await expect(
        eas.connect(txSender).multiRevokeByDelegation(multiDelegatedRevocationRequests, { value: msgValue })
      ).to.be.revertedWithCustomError(contract ?? eas, err);

      break;
    }

    case SignatureType.DelegatedProxy: {
      if (!eip712ProxyUtils) {
        throw new Error('Invalid proxy');
      }

      const multiDelegatedRevocationRequests: MultiDelegatedProxyRevocationRequestStruct[] = [];

      for (const { schema, data } of multiRevocationRequests) {
        const signatures: EIP712Request<EIP712MessageTypes, EIP712RevocationParams>[] = [];

        for (const request of data) {
          const signature = await eip712ProxyUtils.signDelegatedProxyRevocation(
            txSender,
            schema,
            request.uid,
            deadline
          );

          expect(await eip712ProxyUtils.verifyDelegatedProxyRevocationSignature(await txSender.getAddress(), signature))
            .to.be.true;

          signatures.push(signature);
        }

        multiDelegatedRevocationRequests.push({
          schema,
          data,
          signatures,
          revoker: await txSender.getAddress(),
          deadline
        });
      }

      await expect(
        eip712ProxyUtils.proxy
          .connect(txSender)
          .multiRevokeByDelegation(multiDelegatedRevocationRequests, { value: msgValue })
      ).to.be.revertedWithCustomError(contract ?? eas, err);

      break;
    }
  }
};
