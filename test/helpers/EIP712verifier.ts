import { BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { utils } from 'ethers';
import { Delegation } from '@ethereum-attestation-service/eas-sdk';
import { ecsign } from 'ethereumjs-util';

const { formatBytes32String } = utils;

const HARDHAT_CHAIN_ID = 31337;

export class EIP712Verifier {
  delegation: Delegation;

  constructor(contract: string | SignerWithAddress) {
    const contractAddress = typeof contract === 'string' ? contract : contract.address;

    this.delegation = new Delegation({
      address: contractAddress,
      version: '0.2',
      chainId: HARDHAT_CHAIN_ID
    });
  }

  async getAttestationRequest(
    recipient: string | SignerWithAddress,
    ao: BigNumber,
    expirationTime: BigNumber,
    refUUID: string,
    data: string,
    nonce: BigNumber,
    privateKey: string
  ) {
    return this.delegation.getAttestationRequest(
      {
        recipient: typeof recipient === 'string' ? recipient : recipient.address,
        ao,
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
