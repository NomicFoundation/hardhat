import { IgnitionError } from "../../../errors";
import { isRuntimeValue } from "../../type-guards";
import {
  AccountRuntimeValue,
  Future,
  ModuleParameterRuntimeValue,
  ModuleParameterType,
} from "../../types/module";
import { isAddress } from "../utils";
import { assertIgnitionInvariant } from "../utils/assertions";

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

export function resolveFromAddress(
  from: string | AccountRuntimeValue | undefined,
  { accounts }: ReconciliationContext
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

  assertIgnitionInvariant(
    isRuntimeValue(from),
    `Could not resolve from address: ${JSON.stringify(from)}`
  );

  const runtimeAddress = accounts[from.accountIndex];

  assertIgnitionInvariant(
    isAddress(runtimeAddress),
    `From runtime account is not a usable address: ${runtimeAddress}`
  );

  return runtimeAddress;
}

export function resolveModuleParameter(
  moduleParamRuntimeValue: ModuleParameterRuntimeValue<ModuleParameterType>,
  context: ReconciliationContext
): ModuleParameterType {
  const moduleParameters =
    context.deploymentParameters[moduleParamRuntimeValue.moduleId];

  if (moduleParameters === undefined) {
    assertIgnitionInvariant(
      moduleParamRuntimeValue.defaultValue !== undefined,
      `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`
    );

    return moduleParamRuntimeValue.defaultValue;
  }

  const moduleParamValue = moduleParameters[moduleParamRuntimeValue.name];

  if (moduleParamValue === undefined) {
    assertIgnitionInvariant(
      moduleParamRuntimeValue.defaultValue !== undefined,
      `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`
    );

    return moduleParamRuntimeValue.defaultValue;
  }

  return moduleParamValue;
}

export function safeToString(potential: unknown) {
  if (potential === undefined) {
    return "undefined";
  }

  if (typeof potential === "string") {
    return potential;
  }

  return JSON.stringify(potential);
}
