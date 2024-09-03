import type { ProviderRpcError } from "../../../types/providers.js";

import { CustomError } from "@ignored/hardhat-vnext-utils/error";
import { isObject } from "@ignored/hardhat-vnext-utils/lang";

const IS_PROVIDER_ERROR_PROPERTY_NAME = "_isProviderError";

/**
 * Codes taken from: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1474.md#error-codes
 */
export class ProviderError extends CustomError implements ProviderRpcError {
  public code: number;
  public data?: unknown;

  constructor(message: string, code: number, parentError?: Error) {
    super(message, parentError);
    this.code = code;

    Object.defineProperty(this, IS_PROVIDER_ERROR_PROPERTY_NAME, {
      configurable: false,
      enumerable: false,
      writable: false,
      value: true,
    });
  }

  public static isProviderError(other: unknown): other is ProviderError {
    if (!isObject(other)) {
      return false;
    }

    const isProviderErrorProperty = Object.getOwnPropertyDescriptor(
      other,
      IS_PROVIDER_ERROR_PROPERTY_NAME,
    );

    return isProviderErrorProperty?.value === true;
  }
}

export class LimitExceededError extends ProviderError {
  public static readonly CODE = -32005;

  constructor(parent?: Error) {
    super("Request exceeds defined limit", LimitExceededError.CODE, parent);
  }
}
