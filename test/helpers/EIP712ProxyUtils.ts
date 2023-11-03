import { AbiCoder, keccak256, Signer, toUtf8Bytes } from 'ethers';
import { network } from 'hardhat';
import { EIP712Proxy } from '../../typechain-types';
import {
  DomainTypedData,
  EIP712_DOMAIN,
  EIP712AttestationParams,
  EIP712MessageTypes,
  EIP712Request,
  EIP712RevocationParams,
  EIP712Utils,
  TypedData,
  TypedDataConfig
} from './EIP712Utils';

export const ATTEST_PROXY_TYPED_SIGNATURE =
  // eslint-disable-next-line max-len
  'Attest(address attester,bytes32 schema,address recipient,uint64 expirationTime,bool revocable,bytes32 refUID,bytes data,uint256 value,uint64 deadline)';
export const REVOKE_PROXY_TYPED_SIGNATURE =
  'Revoke(address revoker,bytes32 schema,bytes32 uid,uint256 value,uint64 deadline)';
export const ATTEST_PROXY_PRIMARY_TYPE = 'Attest';
export const REVOKE_PROXY_PRIMARY_TYPE = 'Revoke';
export const ATTEST_PROXY_TYPE: TypedData[] = [
  { name: 'attester', type: 'address' },
  { name: 'schema', type: 'bytes32' },
  { name: 'recipient', type: 'address' },
  { name: 'expirationTime', type: 'uint64' },
  { name: 'revocable', type: 'bool' },
  { name: 'refUID', type: 'bytes32' },
  { name: 'data', type: 'bytes' },
  { name: 'value', type: 'uint256' },
  { name: 'deadline', type: 'uint64' }
];
export const REVOKE_PROXY_TYPE: TypedData[] = [
  { name: 'revoker', type: 'address' },
  { name: 'schema', type: 'bytes32' },
  { name: 'uid', type: 'bytes32' },
  { name: 'value', type: 'uint256' },
  { name: 'deadline', type: 'uint64' }
];

export class EIP712ProxyUtils {
  public proxy: EIP712Proxy;
  private config?: TypedDataConfig;
  private name?: string;

  private constructor(proxy: EIP712Proxy) {
    this.proxy = proxy;
  }

  public static async fromProxy(verifier: EIP712Proxy) {
    const utils = new EIP712ProxyUtils(verifier);
    await utils.init();

    return utils;
  }

  public async init() {
    this.config = {
      address: await this.proxy.getAddress(),
      version: await this.proxy.version(),
      chainId: network.config.chainId!
    };

    this.name = await this.proxy.getName();
  }

  public getDomainSeparator(name: string) {
    if (!this.config) {
      throw new Error("EIP712ProxyUtils wasn't initialized");
    }

    return keccak256(
      AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [
          keccak256(toUtf8Bytes(EIP712_DOMAIN)),
          keccak256(toUtf8Bytes(name)),
          keccak256(toUtf8Bytes(this.config.version)),
          this.config.chainId,
          this.config.address
        ]
      )
    );
  }

  public getDomainTypedData(): DomainTypedData {
    if (!this.config || !this.name) {
      throw new Error("EIP712ProxyUtils wasn't initialized");
    }

    return {
      name: this.name,
      version: this.config.version,
      chainId: this.config.chainId,
      verifyingContract: this.config.address
    };
  }

  public async signDelegatedProxyAttestation(
    attester: Signer,
    schema: string,
    recipient: string | Signer,
    expirationTime: bigint,
    revocable: boolean,
    refUID: string,
    data: string,
    value: bigint,
    deadline: bigint
  ): Promise<EIP712Request<EIP712MessageTypes, EIP712AttestationParams>> {
    const params = {
      attester: await attester.getAddress(),
      schema,
      recipient: typeof recipient === 'string' ? recipient : await recipient.getAddress(),
      expirationTime,
      revocable,
      refUID,
      data: Buffer.from(data.slice(2), 'hex'),
      value,
      deadline
    };

    return EIP712Utils.signTypedDataRequest<EIP712MessageTypes, EIP712AttestationParams>(
      params,
      {
        domain: this.getDomainTypedData(),
        primaryType: ATTEST_PROXY_PRIMARY_TYPE,
        message: params,
        types: {
          Attest: ATTEST_PROXY_TYPE
        }
      },
      attester
    );
  }

  public async verifyDelegatedProxyAttestationSignature(
    attester: string | Signer,
    request: EIP712Request<EIP712MessageTypes, EIP712AttestationParams>
  ): Promise<boolean> {
    return EIP712Utils.verifyTypedDataRequestSignature(
      typeof attester === 'string' ? attester : await attester.getAddress(),
      request
    );
  }

  public async signDelegatedProxyRevocation(
    revoker: Signer,
    schema: string,
    uid: string,
    value: bigint,
    deadline: bigint
  ): Promise<EIP712Request<EIP712MessageTypes, EIP712RevocationParams>> {
    const params = {
      revoker: await revoker.getAddress(),
      schema,
      uid,
      value,
      deadline
    };

    return EIP712Utils.signTypedDataRequest<EIP712MessageTypes, EIP712RevocationParams>(
      params,
      {
        domain: this.getDomainTypedData(),
        primaryType: REVOKE_PROXY_PRIMARY_TYPE,
        message: params,
        types: {
          Revoke: REVOKE_PROXY_TYPE
        }
      },
      revoker
    );
  }

  public async verifyDelegatedProxyRevocationSignature(
    attester: string | Signer,
    request: EIP712Request<EIP712MessageTypes, EIP712RevocationParams>
  ): Promise<boolean> {
    return EIP712Utils.verifyTypedDataRequestSignature(
      typeof attester === 'string' ? attester : await attester.getAddress(),
      request
    );
  }
}
