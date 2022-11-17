import { ContractTransaction } from 'ethers';

export const getTransactionGas = async (res: ContractTransaction) => {
  const receipt = await res.wait();

  return receipt.cumulativeGasUsed;
};

export const getTransactionCost = async (res: ContractTransaction) => {
  const receipt = await res.wait();

  return receipt.effectiveGasPrice.mul(await getTransactionGas(res));
};
