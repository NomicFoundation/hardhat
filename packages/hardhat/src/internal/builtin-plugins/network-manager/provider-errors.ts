import type { ProviderRpcError } from "../../../types/providers.js";

import { CustomError } from "@nomicfoundation/hardhat-utils/error";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

const IS_PROVIDER_ERROR_PROPERTY_NAME = "_isProviderError";

// Codes taken from: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1474.md#error-codes
//
// Code	  Message	              Meaning	                            Category
//
// -32600	Invalid request	      JSON is not a valid request object  standard
// -32601	Method not found	    Method does not exist	              standard
// -32602	Invalid params	      Invalid method parameters	          standard
// -32603	Internal error	      Internal JSON-RPC error	            standard
// -32700	Parse error	          Invalid JSON	                      standard
//
// -32005	Limit exceeded	      Request exceeds defined limit	      non-standard
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

  constructor(message: string = "Limit exceeded", parent?: Error) {
    super(message, LimitExceededError.CODE, parent);
  }
}

export class InvalidJsonInputError extends ProviderError {
  public static readonly CODE = -32700;

  constructor(message: string = "Parse error", parent?: Error) {
    super(message, InvalidJsonInputError.CODE, parent);
  }
}

export class InvalidRequestError extends ProviderError {
  public static readonly CODE = -32600;

  constructor(message: string = "Invalid request", parent?: Error) {
    super(message, InvalidRequestError.CODE, parent);
  }
}

export class MethodNotFoundError extends ProviderError {
  public static readonly CODE = -32601;

  constructor(message: string = "Method not found", parent?: Error) {
    super(message, MethodNotFoundError.CODE, parent);
  }
}

export class InvalidArgumentsError extends ProviderError {
  public static readonly CODE = -32602;

  constructor(message: string = "Invalid params", parent?: Error) {
    super(message, InvalidArgumentsError.CODE, parent);
  }
}

export class InternalError extends ProviderError {
  public static readonly CODE = -32603;

  constructor(message: string = "Internal error", parent?: Error) {
    super(message, InternalError.CODE, parent);
  }
}

export class UnknownError extends ProviderError {
  public static readonly CODE = -1;

  constructor(message: string = "Unknown error", parent?: Error) {
    super(message, UnknownError.CODE, parent);
  }
}

/**
 * Thrown by `eth_estimateGas` when the network's `gasEstimationMode` is
 * `"noInternalOutOfGas"` and an internal call runs out of gas even when the
 * transaction is executed with the maximum amount of gas available, meaning
 * that no gas limit can prevent the internal out-of-gas error.
 */
export class InternalCallOutOfGasError extends ProviderError {
  public static readonly CODE = -32000;

  constructor(
    message: string = "Gas estimation failed: an internal call runs out of gas regardless of the transaction's gas limit, so no reliable estimate exists. Set an explicit gas limit for the transaction, or set the network's gasEstimationMode to 'topLevelSuccess' to only require the top-level call to succeed.",
    parent?: Error,
  ) {
    super(message, InternalCallOutOfGasError.CODE, parent);
  }
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

/**
 * Detects an internal-call-out-of-gas estimation failure, whether it was
 * thrown in-process as an `InternalCallOutOfGasError` or received over
 * JSON-RPC (e.g. from a `hardhat node` server), where only the error data's
 * `reason` discriminator survives serialization.
 */
export function isInternalCallOutOfGasError(error: Error): boolean {
  if (error instanceof InternalCallOutOfGasError) {
    return true;
  }

  return (
    ProviderError.isProviderError(error) &&
    isInternalCallOutOfGasErrorData(error.data)
  );
}
