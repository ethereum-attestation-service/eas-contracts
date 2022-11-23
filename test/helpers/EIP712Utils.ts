import { HARDHAT_CHAIN_ID } from '../../utils/Constants';
import { Delegation } from '@ethereum-attestation-service/eas-sdk';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ecsign } from 'ethereumjs-util';
import { BigNumber, BigNumberish } from 'ethers';

export class EIP712Utils {
  delegation: Delegation;

  constructor(contract: string | SignerWithAddress) {
    const contractAddress = typeof contract === 'string' ? contract : contract.address;

    this.delegation = new Delegation({
      address: contractAddress,
      version: '0.15',
      chainId: HARDHAT_CHAIN_ID
    });
  }

  async getAttestationRequest(
    recipient: string | SignerWithAddress,
    schema: string,
    expirationTime: BigNumberish,
    refUUID: string,
    data: string,
    nonce: BigNumber,
    privateKey: Buffer
  ) {
    return this.delegation.getAttestationRequest(
      {
        recipient: typeof recipient === 'string' ? recipient : recipient.address,
        schema,
        expirationTime,
        refUUID,
        data: Buffer.from(data.slice(2), 'hex'),
        nonce
      },
      async (message) => {
        const { v, r, s } = ecsign(message, privateKey);
        return { v, r, s };
      }
    );
  }

  async getRevocationRequest(uuid: string, nonce: BigNumber, privateKey: Buffer) {
    return this.delegation.getRevocationRequest(
      {
        uuid,
        nonce
      },
      async (message) => {
        const { v, r, s } = ecsign(message, privateKey);
        return { v, r, s };
      }
    );
  }
}
