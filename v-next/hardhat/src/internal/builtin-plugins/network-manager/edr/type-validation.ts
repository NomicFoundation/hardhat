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
