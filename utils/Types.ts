import Decimal from 'decimal.js';

type Input = Decimal | number | bigint;

const DEFAULT_DECIMALS = 18n;

export const toWei = <T extends Input>(v: T, decimals = DEFAULT_DECIMALS): bigint => {
  if (Decimal.isDecimal(v)) {
    return BigInt((v as Decimal).mul(new Decimal(10).pow(new Decimal(decimals.toString()))).toFixed());
  }

  return BigInt(v) * 10n ** decimals;
};
