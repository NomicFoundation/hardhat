// Shared error fixtures that mimic the no-data EVM execution failures providers
// report through eth_call / eth_estimateGas. Used by both the unit tests for the
// classification helpers and the integration tests for the `.revert` matcher.

/**
 * The error ethers throws for a failed call/estimateGas with no return data: a
 * `CALL_EXCEPTION` wrapper that keeps the original provider error under
 * `info.error`.
 */
export function createNoDataCallException(
  action: "call" | "estimateGas",
  rpcError: Error | { code?: number; data?: unknown; message: string } = {
    code: -32003,
    message: "EVM error InvalidFEOpcode",
  },
): Error {
  return Object.assign(new Error("missing revert data"), {
    code: "CALL_EXCEPTION",
    action,
    data: null,
    reason: null,
    shortMessage: "missing revert data",
    info: {
      error: rpcError,
    },
  });
}

/**
 * A plain provider error reported directly (no ethers wrapper), carrying a
 * JSON-RPC execution code and message but no return data.
 */
export function createNoDataProviderExecutionError(
  code: number,
  message = "EVM error InvalidFEOpcode",
): Error {
  return Object.assign(new Error(message), {
    code,
    data: undefined,
  });
}

/**
 * A provider error whose `data` holds the JSON-RPC error envelope (with no
 * nested return-data field), as some HTTP/EDR providers populate it.
 */
export function createNoDataProviderExecutionErrorWithEnvelopeData(
  code: number,
): Error {
  return Object.assign(new Error("EVM error InvalidFEOpcode"), {
    code,
    data: {
      code,
      message: "EVM error InvalidFEOpcode",
    },
  });
}

/**
 * A provider error wrapped one level down, where the meaningful code and message
 * live under `error.error`.
 */
export function createNestedNoDataProviderExecutionError(code: number): Error {
  return Object.assign(new Error("missing revert data"), {
    code: -1,
    error: {
      code,
      message: "EVM error InvalidFEOpcode",
    },
  });
}
