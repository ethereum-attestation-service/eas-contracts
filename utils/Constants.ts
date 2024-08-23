import { ZeroAddress } from 'ethers';

export enum DeploymentNetwork {
  Mainnet = 'mainnet',
  Optimism = 'optimism',
  Base = 'base',
  ArbitrumOne = 'arbitrum-one',
  ArbitrumNova = 'arbitrum-nova',
  Polygon = 'polygon',
  Scroll = 'scroll',
  ZKSync = 'zksync',
  Celo = 'celo',
  Linea = 'linea',
  Sepolia = 'sepolia',
  OptimismSepolia = 'optimism-sepolia',
  OptimismGoerli = 'optimism-goerli',
  BaseSepolia = 'base-sepolia',
  BaseGoerli = 'base-goerli',
  ArbitrumGoerli = 'arbitrum-goerli',
  PolygonAmoy = 'polygon-amoy',
  ScrollSepolia = 'scroll-sepolia',
  LineaGoerli = 'linea-goerli',
  Hardhat = 'hardhat',
  RootstockTestnet = 'rootstock-testnet',
  Rootstock = 'rootstock',
}

export const ZERO_ADDRESS = ZeroAddress;
export const ZERO_BYTES = '0x';
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';

export const NO_EXPIRATION = 0n;
