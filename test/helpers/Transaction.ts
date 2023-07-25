import { TransactionResponse } from 'ethers';

export const getTransactionGas = async (res: TransactionResponse) => {
  const receipt = await res.wait();
  if (!receipt) {
    throw new Error(`Unable to confirm: ${res}`);
  }

  return receipt.cumulativeGasUsed;
};

export const getTransactionCost = async (res: TransactionResponse) => {
  const receipt = await res.wait();
  if (!receipt) {
    throw new Error(`Unable to confirm: ${res}`);
  }

  return receipt.gasPrice * (await getTransactionGas(res));
};
