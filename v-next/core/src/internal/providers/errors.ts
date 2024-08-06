import type { ProviderRpcError } from "../../types/providers.js";

import { CustomError } from "@ignored/hardhat-vnext-utils/error";
import { isObject } from "@ignored/hardhat-vnext-utils/lang";

const IS_PROVIDER_ERROR_PROPERTY_NAME = "_isProviderError";

/**
 * The error codes that a provider can return.
 * See https://eips.ethereum.org/EIPS/eip-1474#error-codes
 */
export enum ProviderErrorCode {
  LIMIT_EXCEEDED = -32005,
  INVALID_PARAMS = -32602,
}

type ProviderErrorMessages = {
  [key in ProviderErrorCode]: string;
};

/**
 * The error messages associated with each error code.
 */
const ProviderErrorMessage: ProviderErrorMessages = {
  [ProviderErrorCode.LIMIT_EXCEEDED]: "Request exceeds defined limit",
  [ProviderErrorCode.INVALID_PARAMS]: "Invalid method parameters",
};

export class ProviderError extends CustomError implements ProviderRpcError {
  public code: number;
  public data?: unknown;

  constructor(code: ProviderErrorCode, parentError?: Error) {
    super(ProviderErrorMessage[code], parentError);
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
