import type {
  ConfigurationVariable,
  ResolvedConfigurationVariable,
} from "../../types/config.js";
import type { HookManager } from "../../types/hooks.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import {
  getUnprefixedHexString,
  isHexString,
  normalizeHexString,
} from "@nomicfoundation/hardhat-utils/hex";
import { AsyncMutex } from "@nomicfoundation/hardhat-utils/synchronization";

export const CONFIGURATION_VARIABLE_MARKER = "{variable}";

export function resolveConfigurationVariable(
  hooks: HookManager,
  variable: ConfigurationVariable | string,
): ResolvedConfigurationVariable {
  if (typeof variable === "string") {
    return new FixedValueConfigurationVariable(variable);
  }

  return new LazyResolvedConfigurationVariable(hooks, variable);
}

/**
 * Returns true if the value is a hex-encoded private key: a hex string with
 * exactly 64 digits (32 bytes), with or without the 0x prefix.
 */
export function isPrivateKey(value: string): boolean {
  return isHexString(value) && getUnprefixedHexString(value).length === 64;
}

/**
 * Returns the value of a configuration variable that holds a private key,
 * normalized like `getHexString` does.
 *
 * @throws a HardhatError if the value isn't a hex-encoded private key.
 */
export async function getPrivateKey(
  variable: ResolvedConfigurationVariable,
): Promise<string> {
  const privateKey = await variable.getHexString();

  if (!isPrivateKey(privateKey)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG_VARIABLE_PRIVATE_KEY,
      {
        configVariable:
          BaseResolvedConfigurationVariable.getDescription(variable),
      },
    );
  }

  return privateKey;
}

abstract class BaseResolvedConfigurationVariable implements ResolvedConfigurationVariable {
  public _type: "ResolvedConfigurationVariable" =
    "ResolvedConfigurationVariable";

  #cachedValue?: string;

  protected abstract _getRawValue(): Promise<string>;

  /**
   * A description of this variable, used to identify it in error messages.
   *
   * Resolved values may be secrets, so they must never be included in errors.
   */
  protected abstract _getDescription(): string;

  /**
   * Returns the description of a variable, for errors thrown outside of its
   * own methods.
   */
  public static getDescription(
    variable: ResolvedConfigurationVariable,
  ): string {
    // Hardhat only creates instances of this class, but other implementations
    // of the public interface can't describe themselves
    return variable instanceof BaseResolvedConfigurationVariable
      ? variable._getDescription()
      : "a configuration variable";
  }

  constructor(public readonly format: string) {
    assertHardhatInvariant(
      this.format.includes(CONFIGURATION_VARIABLE_MARKER),
      "The format must include the variable marker",
    );
  }

  public async get(): Promise<string> {
    if (this.#cachedValue === undefined) {
      this.#cachedValue = await this._getRawValue();
    }

    return this.format.replaceAll(
      CONFIGURATION_VARIABLE_MARKER,
      this.#cachedValue,
    );
  }

  public async getUrl(): Promise<string> {
    const value = await this.get();

    try {
      new URL(value);
      return value;
    } catch (_error) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG_VARIABLE_URL,
        { configVariable: this._getDescription() },
      );
    }
  }

  public async getBigInt(): Promise<bigint> {
    const value = await this.get();

    try {
      return BigInt(value);
    } catch (_error) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG_VARIABLE_BIGINT,
        { configVariable: this._getDescription() },
      );
    }
  }

  public async getHexString(): Promise<string> {
    const value = await this.get();
    try {
      return normalizeHexString(value);
    } catch {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.GENERAL.INVALID_CONFIG_VARIABLE_HEX_STRING,
        { configVariable: this._getDescription() },
      );
    }
  }
}

export class LazyResolvedConfigurationVariable extends BaseResolvedConfigurationVariable {
  // We want to serialize the calls to the configurationVariables#fetchValue
  // hook for each HRE. We don't have the HRE here, so we create a mutex per
  // HookManager, which is equivalent.
  static readonly #mutexes: WeakMap<HookManager, AsyncMutex> = new WeakMap();

  readonly #hooks: HookManager;
  readonly #variable: ConfigurationVariable;

  public readonly name: string;

  constructor(hooks: HookManager, variable: ConfigurationVariable) {
    super(variable.format ?? CONFIGURATION_VARIABLE_MARKER);
    this.name = variable.name;
    this.#hooks = hooks;
    this.#variable = variable;

    if (!LazyResolvedConfigurationVariable.#mutexes.has(hooks)) {
      LazyResolvedConfigurationVariable.#mutexes.set(hooks, new AsyncMutex());
    }
  }

  protected _getDescription(): string {
    return `the configuration variable "${this.name}"`;
  }

  protected async _getRawValue(): Promise<string> {
    // Env vars take precedence over every configurationVariables plugin hook
    // (e.g. keystore). Skip the hook chain entirely when the env var is set so
    // plugins are not consulted and cannot override the env value.
    const envValue = process.env[this.#variable.name];
    if (typeof envValue === "string") {
      return envValue;
    }

    const mutex = LazyResolvedConfigurationVariable.#mutexes.get(this.#hooks);
    assertHardhatInvariant(mutex !== undefined, "Mutex must be defined");

    return await mutex.exclusiveRun(
      async () =>
        await this.#hooks.runHandlerChain(
          "configurationVariables",
          "fetchValue",
          [this.#variable],
          async (_context, v) => {
            // Fall back to the default only when the env var is unset. An empty
            // string still takes precedence
            const value = process.env[v.name] ?? v.default;

            if (typeof value !== "string") {
              throw new HardhatError(
                HardhatError.ERRORS.CORE.GENERAL.ENV_VAR_NOT_FOUND,
                { name: v.name },
              );
            }

            return value;
          },
        ),
    );
  }
}

export class FixedValueConfigurationVariable extends BaseResolvedConfigurationVariable {
  readonly #value: string;

  constructor(value: string) {
    super(CONFIGURATION_VARIABLE_MARKER);
    this.#value = value;
  }

  protected _getDescription(): string {
    return "an inline configuration value";
  }

  protected async _getRawValue(): Promise<string> {
    return this.#value;
  }
}
