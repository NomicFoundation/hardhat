// Taken from: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1474.md#error-codes
//
// Code	  Message	              Meaning	                            Category
//
// -32700	Parse error	          Invalid JSON	                      standard
// -32600	Invalid request	      JSON is not a valid request object  standard
// -32601	Method not found	    Method does not exist	              standard
// -32602	Invalid params	      Invalid method parameters	          standard
// -32603	Internal error	      Internal JSON-RPC error	            standard
// -32004	Method not supported	Method is not implemented	          non-standard
//
// Not implemented:
// -32000	Invalid input	        Missing or invalid parameters	      non-standard
// -32001	Resource not found	  Requested resource not found	      non-standard
// -32002	Resource unavailable	Requested resource not available	  non-standard
// -32003	Transaction rejected	Transaction creation failed	        non-standard

export class BuidlerEVMProviderError extends Error {
  public static isBuidlerEVMProviderError(
    other: any
  ): other is BuidlerEVMProviderError {
    return (
      other !== undefined &&
      other !== null &&
      other._isBuidlerEVMProviderError === true
    );
  }

  private readonly _isBuidlerEVMProviderError: boolean;

  constructor(message: string, public readonly code: number) {
    super(message);

    this._isBuidlerEVMProviderError = true;
  }
}

export class InvalidJsonInputError extends BuidlerEVMProviderError {
  public static readonly CODE = -32700;

  constructor(message: string) {
    super(message, InvalidJsonInputError.CODE);
  }
}

export class InvalidRequestError extends BuidlerEVMProviderError {
  public static readonly CODE = -32600;

  constructor(message: string) {
    super(message, InvalidRequestError.CODE);
  }
}

export class MethodNotFoundError extends BuidlerEVMProviderError {
  public static readonly CODE = -32601;

  constructor(message: string) {
    super(message, MethodNotFoundError.CODE);
  }
}

export class InvalidArgumentsError extends BuidlerEVMProviderError {
  public static readonly CODE = -32602;

  constructor(message: string) {
    super(message, InvalidArgumentsError.CODE);
  }
}

export class InternalError extends BuidlerEVMProviderError {
  public static readonly CODE = -32603;

  constructor(message: string) {
    super(message, InternalError.CODE);
  }
}

export class InvalidInputError extends BuidlerEVMProviderError {
  public static readonly CODE = -32000;

  constructor(message: string) {
    super(message, InvalidInputError.CODE);
  }
}

export class TransactionExecutionError extends BuidlerEVMProviderError {
  public static readonly CODE = -32003;

  public parent: Error;

  constructor(parent: Error | string) {
    if (typeof parent === "string") {
      parent = new Error(parent);
    }

    super(parent.message, TransactionExecutionError.CODE);

    this.parent = parent;
    this.stack = parent.stack;
  }
}

export class MethodNotSupportedError extends BuidlerEVMProviderError {
  public static readonly CODE = -32004;

  constructor(message: string) {
    super(message, MethodNotSupportedError.CODE);
  }
}
