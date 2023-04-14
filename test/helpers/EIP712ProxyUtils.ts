import { TestEIP712Proxy } from '../../typechain-types';
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
import { TypedDataSigner } from '@ethersproject/abstract-signer';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, network } from 'hardhat';

const {
  utils: { keccak256, toUtf8Bytes, defaultAbiCoder }
} = ethers;

export const ATTEST_PROXY_TYPED_SIGNATURE =
  'Attest(bytes32 schema,address recipient,uint64 expirationTime,bool revocable,bytes32 refUID,bytes data,uint64 deadline)';
export const REVOKE_PROXY_TYPED_SIGNATURE = 'Revoke(bytes32 schema,bytes32 uid,uint64 deadline)';
export const ATTEST_PROXY_PRIMARY_TYPE = 'Attest';
export const REVOKE_PROXY_PRIMARY_TYPE = 'Revoke';
export const ATTEST_PROXY_TYPE: TypedData[] = [
  { name: 'schema', type: 'bytes32' },
  { name: 'recipient', type: 'address' },
  { name: 'expirationTime', type: 'uint64' },
  { name: 'revocable', type: 'bool' },
  { name: 'refUID', type: 'bytes32' },
  { name: 'data', type: 'bytes' },
  { name: 'deadline', type: 'uint64' }
];
export const REVOKE_PROXY_TYPE: TypedData[] = [
  { name: 'schema', type: 'bytes32' },
  { name: 'uid', type: 'bytes32' },
  { name: 'deadline', type: 'uint64' }
];

export class EIP712ProxyUtils {
  public proxy: TestEIP712Proxy;
  private config?: TypedDataConfig;
  private name?: string;

  private constructor(proxy: TestEIP712Proxy) {
    this.proxy = proxy;
  }

  public static async fromProxy(verifier: TestEIP712Proxy) {
    const utils = new EIP712ProxyUtils(verifier);
    await utils.init();

    return utils;
  }

  public async init() {
    this.config = {
      address: this.proxy.address,
      version: await this.proxy.VERSION(),
      chainId: network.config.chainId!
    };

    this.name = await this.proxy.getName();
  }

  public getDomainSeparator(name: string) {
    if (!this.config) {
      throw new Error("EIP712ProxyUtils wasn't initialized");
    }

    return keccak256(
      defaultAbiCoder.encode(
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

  public signDelegatedProxyAttestation(
    attester: TypedDataSigner,
    schema: string,
    recipient: string | SignerWithAddress,
    expirationTime: number,
    revocable: boolean,
    refUID: string,
    data: string,
    deadline: number
  ): Promise<EIP712Request<EIP712MessageTypes, EIP712AttestationParams>> {
    const params = {
      schema,
      recipient: typeof recipient === 'string' ? recipient : recipient.address,
      expirationTime,
      revocable,
      refUID,
      data: Buffer.from(data.slice(2), 'hex'),
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

  public verifyDelegatedProxyAttestationSignature(
    attester: string | SignerWithAddress,
    request: EIP712Request<EIP712MessageTypes, EIP712AttestationParams>
  ): boolean {
    return EIP712Utils.verifyTypedDataRequestSignature(
      typeof attester === 'string' ? attester : attester.address,
      request
    );
  }

  public signDelegatedProxyRevocation(
    attester: TypedDataSigner,
    schema: string,
    uid: string,
    deadline: number
  ): Promise<EIP712Request<EIP712MessageTypes, EIP712RevocationParams>> {
    const params = {
      schema,
      uid,
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
      attester
    );
  }

  public verifyDelegatedProxyRevocationSignature(
    attester: string | SignerWithAddress,
    request: EIP712Request<EIP712MessageTypes, EIP712RevocationParams>
  ): boolean {
    return EIP712Utils.verifyTypedDataRequestSignature(
      typeof attester === 'string' ? attester : attester.address,
      request
    );
  }
}
