import { HARDHAT_CHAIN_ID } from '../../utils/Constants';
import { Delegated, EIP712Request, Offchain, SignedOffchainAttestation } from '@ethereum-attestation-service/eas-sdk';
import { TypedDataSigner } from '@ethersproject/abstract-signer';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';

export const ATTEST_TYPED_SIGNATURE =
  'Attest(address recipient,bytes32 schema,uint32 expirationTime,bytes32 refUUID,bytes data,uint256 nonce)';
export const REVOKE_TYPED_SIGNATURE = 'Revoke(bytes32 uuid,uint256 nonce)';

export class EIP712Utils {
  delegated: Delegated;
  offchain: Offchain;

  constructor(contract: string | SignerWithAddress) {
    const contractAddress = typeof contract === 'string' ? contract : contract.address;

    const config = {
      address: contractAddress,
      version: '0.17',
      chainId: HARDHAT_CHAIN_ID
    };

    this.delegated = new Delegated(config);
    this.offchain = new Offchain(config);
  }

  public async signDelegatedAttestation(
    attester: TypedDataSigner,
    recipient: string | SignerWithAddress,
    schema: string,
    expirationTime: number,
    revocable: boolean,
    refUUID: string,
    data: string,
    nonce: BigNumber
  ): Promise<EIP712Request> {
    return this.delegated.signDelegatedAttestation(
      {
        recipient: typeof recipient === 'string' ? recipient : recipient.address,
        schema,
        expirationTime,
        revocable,
        refUUID,
        data: Buffer.from(data.slice(2), 'hex'),
        nonce: nonce.toNumber()
      },
      attester
    );
  }

  public async verifyDelegatedAttestationSignature(
    attester: string | SignerWithAddress,
    request: EIP712Request
  ): Promise<boolean> {
    return this.delegated.verifyDelegatedAttestationSignature(
      typeof attester === 'string' ? attester : attester.address,
      request
    );
  }

  public async signDelegatedRevocation(
    attester: TypedDataSigner,
    uuid: string,
    nonce: BigNumber
  ): Promise<EIP712Request> {
    return this.delegated.signDelegatedRevocation(
      {
        uuid,
        nonce: nonce.toNumber()
      },
      attester
    );
  }

  public async verifyDelegatedRevocationSignature(
    attester: string | SignerWithAddress,
    request: EIP712Request
  ): Promise<boolean> {
    return this.delegated.verifyDelegatedRevocationSignature(
      typeof attester === 'string' ? attester : attester.address,
      request
    );
  }

  public async signOffchainAttestation(
    attester: TypedDataSigner,
    schema: string,
    recipient: string | SignerWithAddress,
    time: number,
    expirationTime: number,
    revocable: boolean,
    refUUID: string,
    data: string
  ): Promise<SignedOffchainAttestation> {
    return this.offchain.signOffchainAttestation(
      {
        schema,
        recipient: typeof recipient === 'string' ? recipient : recipient.address,
        time,
        expirationTime,
        revocable,
        refUUID,
        data
      },
      attester
    );
  }

  public async verifyOffchainAttestation(attester: string, request: SignedOffchainAttestation): Promise<boolean> {
    return this.offchain.verifyOffchainAttestationSignature(attester, request);
  }
}
