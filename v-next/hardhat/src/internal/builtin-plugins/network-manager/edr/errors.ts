import type { ProviderRpcError } from "../../../../types/providers.js";

import { CustomError } from "@ignored/hardhat-vnext-utils/error";

// Codes taken from: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1474.md#error-codes
//
// Code	  Message	              Meaning	                            Category
//
// -32700	Parse error	          Invalid JSON	                      standard
// -32600	Invalid request	      JSON is not a valid request object  standard
// -32601	Method not found	    Method does not exist	              standard
// -32602	Invalid params	      Invalid method parameters	          standard
// -32603	Internal error	      Internal JSON-RPC error	            standard
// -32004	Method not supported	Method is not implemented	          non-standard
// -32000	Invalid input	        Missing or invalid parameters	      non-standard
// -32003	Transaction rejected	Transaction creation failed	        non-standard
//
//
// Non standard:

// -32999 Invalid response      The server returned a JSON-RPC      hardhat-sepecific
//                              response, but the result is not
//                              in the expected format
//
// Not implemented:
//
// -32001	Resource not found	  Requested resource not found	      non-standard
// -32002	Resource unavailable	Requested resource not available	  non-standard

export class ProviderError extends CustomError implements ProviderRpcError {
  public static isProviderError(other: any): other is ProviderError {
    return (
      other !== undefined && other !== null && other._isProviderError === true
    );
  }
  public code: number;
  public data?: unknown;

  public readonly _parent?: Error;
  readonly #isProviderError;

  constructor(message: string, code: number, parent?: Error) {
    super(message, parent);
    this.code = code;

    this.#isProviderError = true;
    this._parent = parent;
  }
}

export class InvalidJsonInputError extends ProviderError {
  public static readonly CODE = -32700;

  constructor(message: string, parent?: Error) {
    super(message, InvalidJsonInputError.CODE, parent);
  }
}

export class InvalidRequestError extends ProviderError {
  public static readonly CODE = -32600;

  constructor(message: string, parent?: Error) {
    super(message, InvalidRequestError.CODE, parent);
  }
}

export class MethodNotFoundError extends ProviderError {
  public static readonly CODE = -32601;

  constructor(message: string, parent?: Error) {
    super(message, MethodNotFoundError.CODE, parent);
  }
}

export class InvalidArgumentsError extends ProviderError {
  public static readonly CODE = -32602;

  constructor(message: string, parent?: Error) {
    super(message, InvalidArgumentsError.CODE, parent);
  }
}

export class InternalError extends ProviderError {
  public static readonly CODE = -32603;

  constructor(message: string, parent?: Error) {
    super(message, InternalError.CODE, parent);
  }
}

export class TransactionExecutionError extends ProviderError {
  public static readonly CODE = -32003;

  // TODO: This should have the transaction id
  // TODO: Normalize this constructor
  constructor(parentOrMsg: Error | string) {
    if (typeof parentOrMsg === "string") {
      super(parentOrMsg, TransactionExecutionError.CODE);
    } else {
      super(parentOrMsg.message, TransactionExecutionError.CODE, parentOrMsg);
    }
  }
}

export class MethodNotSupportedError extends ProviderError {
  public static readonly CODE = -32004;

  constructor(method: string, parent?: Error) {
    super(
      `Method ${method} is not supported`,
      MethodNotSupportedError.CODE,
      parent,
    );
  }
}

export class InvalidResponseError extends ProviderError {
  public static readonly CODE = -32999;

  constructor(message: string, parent?: Error) {
    super(message, InvalidResponseError.CODE, parent);
  }
}
