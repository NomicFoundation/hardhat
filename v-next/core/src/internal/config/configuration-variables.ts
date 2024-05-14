import {
  ConfigurationVariable,
  ResolvedConfigurationVariable,
} from "../../types/config.js";
import { HookManager } from "../../types/hooks.js";

export class ResolvedConfigurationVariableImplementation
  implements ResolvedConfigurationVariable
{
  public _type: "ResolvedConfigurationVariable" =
    "ResolvedConfigurationVariable";

  readonly #hooks: HookManager;
  readonly #variable: ConfigurationVariable | string;

  constructor(hooks: HookManager, variable: ConfigurationVariable | string) {
    this.#hooks = hooks;
    this.#variable = variable;
  }

  public async get(): Promise<string> {
    // TODO: Cache
    if (typeof this.#variable === "string") {
      return this.#variable;
    }

    return this.#hooks.runHandlerChain(
      "configurationVariables",
      "fetchValue",
      [this.#variable],
      async (_context, v) => {
        const value = process.env[v.name];

        if (typeof value !== "string") {
          throw new Error("Variable not found");
        }

        return value;
      },
    );
  }

  public async getUrl(): Promise<string> {
    const value = await this.get();

    try {
      new URL(value);
      return value;
    } catch (e) {
      throw new Error(`Invalid URL: ${value}`);
    }
  }

  public async getBigInt(): Promise<bigint> {
    const value = await this.get();

    try {
      return BigInt(value);
    } catch (e) {
      throw new Error(`Invalid BigInt: ${value}`);
    }
  }
}
