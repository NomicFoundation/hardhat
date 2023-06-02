import {
  AccountRuntimeValue,
  Future,
  ModuleParameterType,
} from "../../types/module";

import { ReconciliationFutureResult } from "./types";

export function fail(
  future: Future,
  failure: string
): ReconciliationFutureResult {
  return {
    success: false,
    failure: {
      futureId: future.id,
      failure,
    },
  };
}

export function failWithError(
  future: Future,
  error: unknown
): ReconciliationFutureResult {
  return {
    success: false,
    failure: {
      futureId: future.id,
      failure:
        error instanceof Error
          ? error.message
          : "unknown failure during reconciliation",
    },
  };
}

export function accountRuntimeValueToErrorString(
  potential: AccountRuntimeValue
) {
  return JSON.stringify(potential);
}

export function moduleParameterToErrorString(potential: ModuleParameterType) {
  return JSON.stringify(potential);
}

export function addressToErrorString(potential: string | undefined) {
  if (potential === undefined) {
    return "undefined";
  }

  return potential;
}
