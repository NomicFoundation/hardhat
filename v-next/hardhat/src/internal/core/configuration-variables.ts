import type {
  ConfigurationVariable,
  ResolvedConfigurationVariable,
} from "../../types/config.js";
import type { HookManager } from "../../types/hooks.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

export class ResolvedConfigurationVariableImplementation
  implements ResolvedConfigurationVariable
{
  public _type: "ResolvedConfigurationVariable" =
    "ResolvedConfigurationVariable";

  readonly #hooks: HookManager;
  readonly #variable: ConfigurationVariable | string;
  #cachedValue?: string;

  constructor(hooks: HookManager, variable: ConfigurationVariable | string) {
    this.#hooks = hooks;
    this.#variable = variable;
  }

  public async get(): Promise<string> {
    if (typeof this.#variable === "string") {
      return this.#variable;
    }

    if (this.#cachedValue === undefined) {
      this.#cachedValue = await this.#hooks.runHandlerChain(
        "configurationVariables",
        "fetchValue",
        [this.#variable],
        async (_context, v) => {
          const value = process.env[v.name];

          if (typeof value !== "string") {
            throw new HardhatError(
              HardhatError.ERRORS.GENERAL.ENV_VAR_NOT_FOUND,
            );
          }

          return value;
        },
      );
    }

    return this.#cachedValue;
  }

  public async getUrl(): Promise<string> {
    const value = await this.get();

    try {
      new URL(value);
      return value;
    } catch (e) {
      throw new HardhatError(HardhatError.ERRORS.GENERAL.INVALID_URL, {
        url: value,
      });
    }
  }

  public async getBigInt(): Promise<bigint> {
    const value = await this.get();

    try {
      return BigInt(value);
    } catch (e) {
      throw new HardhatError(HardhatError.ERRORS.GENERAL.INVALID_BIGINT, {
        value,
      });
    }
  }
}
