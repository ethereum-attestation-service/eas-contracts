import { ethers } from 'hardhat';

export * from '../../utils/Time';

export const latest = async () => {
  const block = await ethers.provider.getBlock('latest');
  return block.timestamp;
};
