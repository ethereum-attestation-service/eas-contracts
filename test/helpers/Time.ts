import { ethers } from 'hardhat';

export * from '../../utils/Time';

export const latest = async () => {
  const { timestamp } = await ethers.provider.getBlock('latest');

  return timestamp;
};
