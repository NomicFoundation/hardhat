import { IgnitionError } from "../../../errors";
import { isRuntimeValue } from "../../type-guards";
import {
  AccountRuntimeValue,
  Future,
  ModuleParameterRuntimeValue,
  ModuleParameterType,
} from "../../types/module";
import { isAddress } from "../utils";

import { ReconciliationContext, ReconciliationFutureResult } from "./types";

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

export function resolveFromAddress(
  from: string | AccountRuntimeValue | undefined,
  context: ReconciliationContext
): string | undefined {
  if (from === undefined) {
    return from;
  }

  if (typeof from === "string") {
    if (!isAddress(from)) {
      throw new IgnitionError("From is not a usable address");
    }

    return from;
  }

  if (!isRuntimeValue(from)) {
    throw new IgnitionError(`Could not resolve from address: ${from as any}`);
  }

  const runtimeAddress = context.accounts[from.accountIndex];

  if (!isAddress(runtimeAddress)) {
    throw new IgnitionError(
      `From runtime value is not a usable address: ${runtimeAddress}`
    );
  }

  return runtimeAddress;
}

export function resolveModuleParameter(
  moduleParamRuntimeValue: ModuleParameterRuntimeValue<string>,
  context: ReconciliationContext
) {
  const moduleParamValue =
    context.moduleParameters[moduleParamRuntimeValue.name];

  if (moduleParamValue === undefined) {
    return moduleParamRuntimeValue.defaultValue;
  }

  return moduleParamValue;
}

export function safeToString(potential: ModuleParameterType | undefined) {
  if (potential === undefined) {
    return "undefined";
  }

  if (typeof potential === "string") {
    return potential;
  }

  return JSON.stringify(potential);
}
