import { BigNumber, Wallet } from 'ethers';
import { ethers, waffle } from 'hardhat';

export const createWallet = async () => {
  const wallet = Wallet.createRandom().connect(waffle.provider);
  const deployer = (await ethers.getSigners())[0];
  await deployer.sendTransaction({
    value: BigNumber.from(10_000_000).mul(BigNumber.from(10).pow(18)),
    to: await wallet.getAddress()
  });

  return wallet;
};
