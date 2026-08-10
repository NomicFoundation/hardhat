import { isObject } from "@nomicfoundation/hardhat-utils/lang";

interface EdrProviderErrorData {
  data: string;
  transactionHash?: string;
}

export function isEdrProviderErrorData(
  errorData: unknown,
): errorData is EdrProviderErrorData {
  return isObject(errorData) && "data" in errorData;
}

/**
 * Detects the error data of EDR's estimation failure for the
 * `NoInternalOutOfGas` gas estimation mode, reported when an internal call
 * runs out of gas even when the transaction is executed with the maximum
 * amount of gas available.
 */
export function isInternalCallOutOfGasErrorData(errorData: unknown): boolean {
  return isObject(errorData) && errorData.reason === "InternalCallOutOfGas";
}
