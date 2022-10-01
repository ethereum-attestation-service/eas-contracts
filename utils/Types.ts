import Decimal from 'decimal.js';
import { BigNumber, BigNumberish } from 'ethers';

type ToWeiInput = Decimal | BigNumberish;

const DEFAULT_DECIMALS = 18;

export const toWei = <T extends ToWeiInput>(v: T, decimals = DEFAULT_DECIMALS): BigNumber => {
  if (Decimal.isDecimal(v)) {
    return BigNumber.from((v as Decimal).mul(new Decimal(10).pow(decimals)).toFixed());
  }

  return BigNumber.from(v).mul(BigNumber.from(10).pow(decimals));
};
