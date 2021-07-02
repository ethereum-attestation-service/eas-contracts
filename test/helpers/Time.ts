import { ethers } from 'hardhat';
import { BigNumber, BigNumberish } from 'ethers';

export const advanceBlock = async () => {
  return await ethers.provider.send('evm_mine', []);
};

export const latest = async () => {
  const block = await ethers.provider.getBlock('latest');
  return BigNumber.from(block.timestamp);
};

const seconds = (val: BigNumberish) => {
  return BigNumber.from(val);
};

const minutes = (val: BigNumberish) => {
  return BigNumber.from(val).mul(seconds(60));
};

const hours = (val: BigNumberish) => {
  return BigNumber.from(val).mul(minutes(60));
};

const days = (val: BigNumberish) => {
  return BigNumber.from(val).mul(hours(24));
};

const weeks = (val: BigNumberish) => {
  return BigNumber.from(val).mul(days(7));
};

const years = (val: BigNumberish) => {
  return BigNumber.from(val).mul(days(365));
};

export const duration = { seconds, minutes, hours, days, weeks, years };
