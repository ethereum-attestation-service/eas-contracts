import { ZeroAddress } from 'ethers';

export enum DeploymentNetwork {
  Mainnet = 'mainnet',
  Optimism = 'optimism',
  Base = 'base',
  ArbitrumOne = 'arbitrum-one',
  ArbitrumNova = 'arbitrum-nova',
  Polygon = 'polygon',
  Scroll = 'scroll',
  Celo = 'celo',
  LUKSOMainnet = 'lukso-mainnet',
  Linea = 'linea',
  Sepolia = 'sepolia',
  OptimismSepolia = 'optimism-sepolia',
  OptimismGoerli = 'optimism-goerli',
  BaseSepolia = 'base-sepolia',
  BaseGoerli = 'base-goerli',
  ArbitrumGoerli = 'arbitrum-goerli',
  PolygonMumbai = 'polygon-mumbai',
  ScrollSepolia = 'scroll-sepolia',
  LUKSOTestnet = 'lukso-testnet',
  LineaGoerli = 'linea-goerli',
  Hardhat = 'hardhat'
}

export const ZERO_ADDRESS = ZeroAddress;
export const ZERO_BYTES = '0x';
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

export const NO_EXPIRATION = 0n;
