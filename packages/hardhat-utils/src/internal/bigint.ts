export async function isBNBigInt(n: unknown) {
  try {
    const { default: BN } = await import("bn.js");
    return BN.isBN(n);
  } catch (e) {
    return false;
  }
}

export async function isBigNumberBigInt(n: unknown) {
  try {
    const { BigNumber } = await import("bignumber.js");
    return BigNumber.isBigNumber(n);
  } catch (e) {
    return false;
  }
}
