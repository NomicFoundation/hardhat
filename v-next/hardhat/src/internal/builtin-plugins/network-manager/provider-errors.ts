import type { ProviderRpcError } from "../../../types/providers.js";

import { CustomError } from "@ignored/hardhat-vnext-utils/error";
import { isObject } from "@ignored/hardhat-vnext-utils/lang";

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
// -32003	Transaction rejected	Transaction creation failed	        non-standard
// -32004	Method not supported	Method is not implemented	          non-standard
// -32005	Limit exceeded	      Request exceeds defined limit	      non-standard
//
// -32999 Invalid response      The server returned a JSON-RPC      hardhat-sepecific
//                              response, but the result is not
//                              in the expected format
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

// TODO: not used, should we remove it?
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

// TODO: not used, should we remove it?
export class TransactionExecutionError extends ProviderError {
  public static readonly CODE = -32003;

  constructor(message: string = "Transaction rejected", parent?: Error) {
    super(message, TransactionExecutionError.CODE, parent);
  }
}

// TODO: not used, should we remove it?
export class MethodNotSupportedError extends ProviderError {
  public static readonly CODE = -32004;

  constructor(message: string = "Method not supported", parent?: Error) {
    super(message, MethodNotSupportedError.CODE, parent);
  }
}

// TODO: not used, should we remove it?
export class InvalidResponseError extends ProviderError {
  public static readonly CODE = -32999;

  constructor(message: string = "Invalid response", parent?: Error) {
    super(message, InvalidResponseError.CODE, parent);
  }
}
