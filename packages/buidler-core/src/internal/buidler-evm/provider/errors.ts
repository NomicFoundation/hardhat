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
  constructor(message: string, public readonly code: number) {
    super(message);
  }
}

export class InvalidJsonInputError extends BuidlerEVMProviderError {
  constructor(message: string) {
    super(message, -32700);
  }
}

export class InvalidRequestError extends BuidlerEVMProviderError {
  constructor(message: string) {
    super(message, -32600);
  }
}

export class MethodNotFoundError extends BuidlerEVMProviderError {
  constructor(message: string) {
    super(message, -32601);
  }
}

export class InvalidArgumentsError extends BuidlerEVMProviderError {
  constructor(message: string) {
    super(message, -32602);
  }
}

export class InternalError extends BuidlerEVMProviderError {
  constructor(message: string) {
    super(message, -32603);
  }
}

export class InvalidInputError extends BuidlerEVMProviderError {
  constructor(message: string) {
    super(message, -32000);
  }
}

export class MethodNotSupportedError extends BuidlerEVMProviderError {
  constructor(message: string) {
    super(message, -32004);
  }
}
