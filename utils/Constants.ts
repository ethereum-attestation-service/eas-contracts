import { ethers } from 'ethers';

const {
  constants: { AddressZero }
} = ethers;

export enum DeploymentNetwork {
  Mainnet = 'mainnet',
  Goerli = 'goerli',
  Hardhat = 'hardhat',
  Tenderly = 'tenderly'
}

export const ZERO_ADDRESS = AddressZero;
export const ZERO_BYTES = '0x';
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

export const MAINNET_CHAIN_ID = 1;
export const HARDHAT_CHAIN_ID = 31337;
