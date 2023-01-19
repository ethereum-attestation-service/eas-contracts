import { EAS, TestEIP712Verifier } from '../../typechain-types';
import { ZERO_ADDRESS } from '../../utils/Constants';
import { TypedDataSigner } from '@ethersproject/abstract-signer';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, BigNumberish, Signature } from 'ethers';
import { ethers, network } from 'hardhat';

const {
  utils: {
    keccak256,
    getAddress,
    verifyTypedData,
    toUtf8Bytes,
    splitSignature,
    joinSignature,
    hexlify,
    defaultAbiCoder
  }
} = ethers;

export interface TypedData {
  name: string;
  type:
    | 'bool'
    | 'uint8'
    | 'uint16'
    | 'uint32'
    | 'uint64'
    | 'uint128'
    | 'uint256'
    | 'address'
    | 'string'
    | 'bytes'
    | 'bytes32';
}

export const EIP712_DOMAIN = 'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)';
export const EIP712_NAME = 'EAS';
export const ATTEST_TYPED_SIGNATURE =
  'Attest(bytes32 schema,address recipient,uint64 expirationTime,bool revocable,bytes32 refUUID,bytes data,uint256 nonce)';
export const REVOKE_TYPED_SIGNATURE = 'Revoke(bytes32 schema,bytes32 uuid,uint256 nonce)';
export const ATTEST_PRIMARY_TYPE = 'Attest';
export const REVOKE_PRIMARY_TYPE = 'Revoke';
export const ATTEST_TYPE: TypedData[] = [
  { name: 'schema', type: 'bytes32' },
  { name: 'recipient', type: 'address' },
  { name: 'expirationTime', type: 'uint64' },
  { name: 'revocable', type: 'bool' },
  { name: 'refUUID', type: 'bytes32' },
  { name: 'data', type: 'bytes' },
  { name: 'nonce', type: 'uint256' }
];
export const REVOKE_TYPE: TypedData[] = [
  { name: 'schema', type: 'bytes32' },
  { name: 'uuid', type: 'bytes32' },
  { name: 'nonce', type: 'uint256' }
];

export interface TypedDataConfig {
  address: string;
  version: string;
  chainId: number;
}

export interface DomainTypedData {
  chainId: number;
  name: string;
  verifyingContract: string;
  version: string;
}

export interface EIP712DomainTypedData {
  chainId: number;
  name: string;
  verifyingContract: string;
  version: string;
}

export interface EIP712MessageTypes {
  [additionalProperties: string]: TypedData[];
}

export type EIP712Params = {
  nonce?: BigNumberish;
};

export interface EIP712TypedData<T extends EIP712MessageTypes, P extends EIP712Params> {
  domain: EIP712DomainTypedData;
  primaryType: keyof T;
  types: T;
  message: P;
}

export interface EIP712Request<T extends EIP712MessageTypes, P extends EIP712Params> extends Signature {
  params: P;
  types: EIP712TypedData<T, P>;
}

export type EIP712AttestationParams = EIP712Params & {
  schema: string;
  recipient: string;
  expirationTime: number;
  revocable: boolean;
  refUUID: string;
  data: Buffer;
};

export type EIP712RevocationParams = EIP712Params & {
  uuid: string;
};

export class EIP712Utils {
  private verifier: EAS | TestEIP712Verifier;
  private config?: TypedDataConfig;

  private constructor(verifier: EAS | TestEIP712Verifier) {
    this.verifier = verifier;
  }

  public static async fromVerifier(verifier: EAS | TestEIP712Verifier) {
    const utils = new EIP712Utils(verifier);
    await utils.init();

    return utils;
  }

  public async init() {
    this.config = {
      address: this.verifier.address,
      version: await this.verifier.VERSION(),
      chainId: network.config.chainId!
    };
  }

  public getDomainSeparator() {
    if (!this.config) {
      throw new Error("EIP712Utils wasn't initialized");
    }

    return keccak256(
      defaultAbiCoder.encode(
        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
        [
          keccak256(toUtf8Bytes(EIP712_DOMAIN)),
          keccak256(toUtf8Bytes(EIP712_NAME)),
          keccak256(toUtf8Bytes(this.config.version)),
          this.config.chainId,
          this.config.address
        ]
      )
    );
  }

  public getDomainTypedData(): DomainTypedData {
    if (!this.config) {
      throw new Error("EIP712Utils wasn't initialized");
    }

    return {
      name: EIP712_NAME,
      version: this.config.version,
      chainId: this.config.chainId,
      verifyingContract: this.config.address
    };
  }

  public signDelegatedAttestation(
    attester: TypedDataSigner,
    schema: string,
    recipient: string | SignerWithAddress,
    expirationTime: number,
    revocable: boolean,
    refUUID: string,
    data: string,
    nonce: BigNumber
  ): Promise<EIP712Request<EIP712MessageTypes, EIP712AttestationParams>> {
    const params = {
      schema,
      recipient: typeof recipient === 'string' ? recipient : recipient.address,
      expirationTime,
      revocable,
      refUUID,
      data: Buffer.from(data.slice(2), 'hex'),
      nonce: nonce.toNumber()
    };

    return EIP712Utils.signTypedDataRequest<EIP712MessageTypes, EIP712AttestationParams>(
      params,
      {
        domain: this.getDomainTypedData(),
        primaryType: ATTEST_PRIMARY_TYPE,
        message: params,
        types: {
          Attest: ATTEST_TYPE
        }
      },
      attester
    );
  }

  public verifyDelegatedAttestationSignature(
    attester: string | SignerWithAddress,
    request: EIP712Request<EIP712MessageTypes, EIP712AttestationParams>
  ): boolean {
    return EIP712Utils.verifyTypedDataRequestSignature(
      typeof attester === 'string' ? attester : attester.address,
      request
    );
  }

  public signDelegatedRevocation(
    attester: TypedDataSigner,
    schema: string,
    uuid: string,
    nonce: BigNumber
  ): Promise<EIP712Request<EIP712MessageTypes, EIP712RevocationParams>> {
    const params = {
      schema,
      uuid,
      nonce: nonce.toNumber()
    };

    return EIP712Utils.signTypedDataRequest<EIP712MessageTypes, EIP712RevocationParams>(
      params,
      {
        domain: this.getDomainTypedData(),
        primaryType: REVOKE_PRIMARY_TYPE,
        message: params,
        types: {
          Revoke: REVOKE_TYPE
        }
      },
      attester
    );
  }

  public verifyDelegatedRevocationSignature(
    attester: string | SignerWithAddress,
    request: EIP712Request<EIP712MessageTypes, EIP712RevocationParams>
  ): boolean {
    return EIP712Utils.verifyTypedDataRequestSignature(
      typeof attester === 'string' ? attester : attester.address,
      request
    );
  }

  private static async signTypedDataRequest<T extends EIP712MessageTypes, P extends EIP712Params>(
    params: P,
    types: EIP712TypedData<T, P>,
    signer: TypedDataSigner
  ): Promise<EIP712Request<T, P>> {
    const rawSignature = await signer._signTypedData(types.domain, types.types, params);

    return { types, params, ...splitSignature(rawSignature) };
  }

  private static verifyTypedDataRequestSignature<T extends EIP712MessageTypes, P extends EIP712Params>(
    attester: string,
    request: EIP712Request<T, P>
  ): boolean {
    if (attester === ZERO_ADDRESS) {
      throw new Error('Invalid address');
    }

    const sig = joinSignature({ v: request.v, r: hexlify(request.r), s: hexlify(request.s) });
    const recoveredAddress = verifyTypedData(request.types.domain, request.types.types, request.params, sig);

    return getAddress(attester) === getAddress(recoveredAddress);
  }
}
