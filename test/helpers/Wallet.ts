import { Wallet } from 'ethers';
import { ethers } from 'hardhat';

// eslint-disable-next-line require-await
export const getBalance = async (address: string) => ethers.provider.getBalance(address);

export const createWallet = async () => {
  const wallet = Wallet.createRandom().connect(ethers.provider);
  const deployer = (await ethers.getSigners())[0];
  await deployer.sendTransaction({
    value: 10_000_000n * 10n ** 18n,
    to: await wallet.getAddress()
  });

  return wallet;
};
