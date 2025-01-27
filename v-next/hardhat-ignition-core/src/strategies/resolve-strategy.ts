import type { ExecutionStrategy } from "../internal/execution/types/execution-strategy";
import type { StrategyConfig } from "../types/deploy";

import { IgnitionError } from "../errors";
import { ERRORS } from "../internal/errors-list";

import { BasicStrategy } from "./basic-strategy";
import { Create2Strategy } from "./create2-strategy";

export function resolveStrategy<StrategyT extends keyof StrategyConfig>(
  strategyName: StrategyT | undefined,
  strategyConfig: StrategyConfig[StrategyT] | undefined,
): ExecutionStrategy {
  if (strategyName === undefined) {
    return new BasicStrategy();
  }

  switch (strategyName) {
    case "basic":
      return new BasicStrategy();
    case "create2":
      if (strategyConfig === undefined) {
        throw new IgnitionError(ERRORS.STRATEGIES.MISSING_CONFIG, {
          strategyName,
        });
      }

      if (typeof strategyConfig.salt !== "string") {
        throw new IgnitionError(ERRORS.STRATEGIES.MISSING_CONFIG_PARAM, {
          strategyName,
          requiredParam: "salt",
        });
      }

      if (hexStringLengthInBytes(strategyConfig.salt) !== 32) {
        throw new IgnitionError(ERRORS.STRATEGIES.INVALID_CONFIG_PARAM, {
          strategyName,
          paramName: "salt",
          reason: "The salt must be 32 bytes in length",
        });
      }

      return new Create2Strategy({ salt: strategyConfig.salt });
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- this is an option that can come from the user we want to retain the check
    default:
      throw new IgnitionError(ERRORS.STRATEGIES.UNKNOWN_STRATEGY, {
        strategyName,
      });
  }
}

function hexStringLengthInBytes(hexString: string) {
  const normalizedHexString = hexString.startsWith("0x")
    ? hexString.substring(2)
    : hexString;

  return normalizedHexString.length / 2;
}
