import * as t from "io-ts";
import { Context, getFunctionName, ValidationError } from "io-ts/lib";
import { Reporter } from "io-ts/lib/Reporter";
import { error } from "util";

import { BuidlerError, ERRORS } from "../errors";

function stringify(v: any): string {
  if (typeof v === "function") {
    return getFunctionName(v);
  }
  if (typeof v === "number" && !isFinite(v)) {
    if (isNaN(v)) {
      return "NaN";
    }
    return v > 0 ? "Infinity" : "-Infinity";
  }
  return JSON.stringify(v);
}

function getContextPath(context: Context): string {
  return (
    context[0].type.name +
    "." +
    context
      .slice(1)
      .map(c => c.key)
      .join(".")
  );
}

function getMessage(e: ValidationError): string {
  const lastContext = e.context[e.context.length - 1];
  return e.message !== undefined
    ? e.message
    : `Invalid value ${stringify(e.value)} for ${getContextPath(
        e.context
      )} - Expected a value of type ${lastContext.type.name}.`;
}

export function failure(es: ValidationError[]): string[] {
  return es.map(getMessage);
}

export function success(): string[] {
  return ["No errors!"];
}

export const DotPathReporter: Reporter<string[]> = {
  report: validation => validation.fold(failure, success)
};

function optional<TypeT, OutputT>(
  codec: t.Type<TypeT, OutputT, unknown>,
  name: string = `${codec.name} | undefined`
): t.Type<TypeT | undefined, OutputT | undefined, unknown> {
  return new t.Type(
    name,
    (u: unknown): u is TypeT | undefined => u === undefined || codec.is(u),
    (u, c) => (u === undefined ? t.success(u) : codec.validate(u, c)),
    a => (a === undefined ? a : codec.encode(a))
  );
}

// IMPORTANT: This t.types MUST be kept in sync with the actual types.

const AutoNetworkAccount = t.type({
  privateKey: t.string,
  balance: t.string
});

const AutoNetworkConfig = t.type({
  chainId: optional(t.number),
  from: optional(t.string),
  gas: optional(t.union([t.literal("auto"), t.number])),
  gasPrice: optional(t.union([t.literal("auto"), t.number])),
  gasMultiplier: optional(t.number),
  accounts: optional(t.array(AutoNetworkAccount)),
  blockGasLimit: optional(t.number)
});

const HDAccountsConfig = t.type({
  mnemonic: t.string,
  initialIndex: optional(t.number),
  count: optional(t.number),
  path: optional(t.string)
});

const OtherAccountsConfig = t.type({
  type: t.string
});

const NetworkConfigAccounts = t.union([
  t.literal("remote"),
  t.array(t.string),
  HDAccountsConfig,
  OtherAccountsConfig
]);

const HttpNetworkConfig = t.type({
  chainId: optional(t.number),
  from: optional(t.string),
  gas: optional(t.union([t.literal("auto"), t.number])),
  gasPrice: optional(t.union([t.literal("auto"), t.number])),
  gasMultiplier: optional(t.number),
  url: optional(t.string),
  accounts: optional(NetworkConfigAccounts)
});

const NetworkConfig = t.union([AutoNetworkConfig, HttpNetworkConfig]);

const Networks = t.record(t.string, NetworkConfig);

const ProjectPaths = t.type({
  root: optional(t.string),
  cache: optional(t.string),
  artifacts: optional(t.string),
  sources: optional(t.string),
  tests: optional(t.string)
});

const EVMVersion = t.string;

const SolcOptimizerConfig = t.type({
  enabled: optional(t.boolean),
  runs: optional(t.number)
});

const SolcConfig = t.type({
  version: optional(t.string),
  optimizer: optional(SolcOptimizerConfig),
  evmVersion: optional(EVMVersion)
});

const BuidlerConfig = t.type(
  {
    networks: optional(Networks),
    paths: optional(ProjectPaths),
    solc: optional(SolcConfig)
  },
  "BuidlerConfig"
);

/**
 * Validates the config, throwing a BuidlerError if invalid.
 * @param config
 */
export function validateConfig(config: any) {
  const errors = getValidationErrors(config);

  if (errors.length === 0) {
    return;
  }

  const errorList = "  * " + errors.join("\n  * ");

  throw new BuidlerError(ERRORS.GENERAL.INVALID_CONFIG, errorList);
}

export function getValidationErrors(config: any): string[] {
  const errors = [];

  // These can't be validated with io-ts
  if (config !== undefined && typeof config.networks === "object") {
    const autoNetwork = config.networks.auto;
    if (autoNetwork !== undefined) {
      if (autoNetwork.url !== undefined) {
        errors.push("BuidlerConfig.networks.auto can't have an url");
      }

      if (
        autoNetwork.blockGasLimit !== undefined &&
        typeof autoNetwork.blockGasLimit !== "number"
      ) {
        errors.push(
          "BuidlerConfig.networks.auto.blockGasLimit must be a number"
        );
      }

      if (autoNetwork.accounts !== undefined) {
        if (Array.isArray(autoNetwork.accounts)) {
          for (const account of autoNetwork.accounts) {
            if (typeof account.privateKey !== "string") {
              errors.push(
                "BuidlerConfig.networks.auto.accounts[].privateKey must be of type: string"
              );
            }

            if (typeof account.privateKey !== "string") {
              errors.push(
                "BuidlerConfig.networks.auto.accounts[].balance must be of type: string"
              );
            }
          }
        } else {
          errors.push(
            "BuidlerConfig.networks.auto.accounts must of type: [{privateKey: string, balance: string}] | undefined"
          );
        }
      }
    }

    for (const [networkName, netConfig] of Object.entries<any>(
      config.networks
    )) {
      if (networkName === "auto") {
        continue;
      }

      if (netConfig.url !== undefined && typeof netConfig.url !== "string") {
        errors.push(
          `BuidlerConfig.networks.${networkName}.url must of type: string | undefined`
        );
      }
    }
  }

  const result = BuidlerConfig.decode(config);

  if (result.isRight()) {
    return errors;
  }

  const ioTsErrors = DotPathReporter.report(result);
  return [...errors, ...ioTsErrors];
}
