import type { DebugTraceResult } from "@nomicfoundation/edr";

import { isObject } from "@nomicfoundation/hardhat-utils/lang";

export function isDebugTraceResult(
  result: unknown,
): result is DebugTraceResult {
  return (
    isObject(result) &&
    "pass" in result &&
    "gasUsed" in result &&
    "structLogs" in result
  );
}

interface EdrProviderErrorData {
  data: string;
  transactionHash?: string;
}

export function isEdrProviderErrorData(
  errorData: unknown,
): errorData is EdrProviderErrorData {
  return isObject(errorData) && "data" in errorData;
}
