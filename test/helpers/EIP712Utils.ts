import { Delegation } from '@ethereum-attestation-service/sdk';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ecsign } from 'ethereumjs-util';
import { BigNumber, BigNumberish } from 'ethers';

const HARDHAT_CHAIN_ID = 31337;

export class EIP712Utils {
  delegation: Delegation;

  constructor(contract: string | SignerWithAddress) {
    const contractAddress = typeof contract === 'string' ? contract : contract.address;

    this.delegation = new Delegation({
      address: contractAddress,
      version: '0.8',
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
    privateKey: string
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
        const { v, r, s } = ecsign(message, Buffer.from(privateKey, 'hex'));
        return { v, r, s };
      }
    );
  }

  async getRevocationRequest(uuid: string, nonce: BigNumber, privateKey: string) {
    return this.delegation.getRevocationRequest(
      {
        uuid,
        nonce
      },
      async (message) => {
        const { v, r, s } = ecsign(message, Buffer.from(privateKey, 'hex'));
        return { v, r, s };
      }
    );
  }
}
