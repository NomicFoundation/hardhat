import * as t from "io-ts";
import { Context, getFunctionName, ValidationError } from "io-ts/lib";
import { Reporter } from "io-ts/lib/Reporter";

import { SUPPORTED_HARDFORKS } from "../../buidler-evm/provider/node";
import { BUIDLEREVM_NETWORK_NAME } from "../../constants";
import { BuidlerError } from "../errors";
import { ERRORS } from "../errors-list";

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
  const keysPath = context
    .slice(1)
    .map(c => c.key)
    .join(".");

  return `${context[0].type.name}.${keysPath}`;
}

function getMessage(e: ValidationError): string {
  const lastContext = e.context[e.context.length - 1];

  return e.message !== undefined
    ? e.message
    : getErrorMessage(
        getContextPath(e.context),
        e.value,
        lastContext.type.name
      );
}

function getErrorMessage(path: string, value: any, expectedType: string) {
  return `Invalid value ${stringify(
    value
  )} for ${path} - Expected a value of type ${expectedType}.`;
}

export function failure(es: ValidationError[]): string[] {
  return es.map(getMessage);
}

export function success(): string[] {
  return [];
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
    a => (a === undefined ? undefined : codec.encode(a))
  );
}

// IMPORTANT: This t.types MUST be kept in sync with the actual types.

const BuidlerNetworkAccount = t.type({
  privateKey: t.string,
  balance: t.string
});

const BuidlerNetworkConfig = t.type({
  hardfork: optional(t.string),
  chainId: optional(t.number),
  from: optional(t.string),
  gas: optional(t.union([t.literal("auto"), t.number])),
  gasPrice: optional(t.union([t.literal("auto"), t.number])),
  gasMultiplier: optional(t.number),
  accounts: optional(t.array(BuidlerNetworkAccount)),
  blockGasLimit: optional(t.number),
  throwOnTransactionFailures: optional(t.boolean),
  throwOnCallFailures: optional(t.boolean)
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

const NetworkConfig = t.union([BuidlerNetworkConfig, HttpNetworkConfig]);

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

const AnalyticsConfig = t.type({
  enabled: optional(t.boolean)
});

const BuidlerConfig = t.type(
  {
    defaultNetwork: optional(t.string),
    networks: optional(Networks),
    paths: optional(ProjectPaths),
    solc: optional(SolcConfig),
    analytics: optional(AnalyticsConfig)
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

  let errorList = errors.join("\n  * ");
  errorList = `  * ${errorList}`;

  throw new BuidlerError(ERRORS.GENERAL.INVALID_CONFIG, { errors: errorList });
}

export function getValidationErrors(config: any): string[] {
  const errors = [];

  // These can't be validated with io-ts
  if (config !== undefined && typeof config.networks === "object") {
    const buidlerNetwork = config.networks[BUIDLEREVM_NETWORK_NAME];
    if (buidlerNetwork !== undefined) {
      if (
        buidlerNetwork.hardfork !== undefined &&
        !SUPPORTED_HARDFORKS.includes(buidlerNetwork.hardfork)
      ) {
        errors.push(
          `BuidlerConfig.networks.${BUIDLEREVM_NETWORK_NAME}.hardfork is not supported. Use one of ${SUPPORTED_HARDFORKS.join(
            ", "
          )}`
        );
      }

      if (
        buidlerNetwork.throwOnTransactionFailures !== undefined &&
        typeof buidlerNetwork.throwOnTransactionFailures !== "boolean"
      ) {
        errors.push(
          getErrorMessage(
            `BuidlerConfig.networks.${BUIDLEREVM_NETWORK_NAME}.throwOnTransactionFailures`,
            buidlerNetwork.throwOnTransactionFailures,
            "boolean | undefined"
          )
        );
      }

      if (
        buidlerNetwork.throwOnCallFailures !== undefined &&
        typeof buidlerNetwork.throwOnCallFailures !== "boolean"
      ) {
        errors.push(
          getErrorMessage(
            `BuidlerConfig.networks.${BUIDLEREVM_NETWORK_NAME}.throwOnCallFailures`,
            buidlerNetwork.throwOnCallFailures,
            "boolean | undefined"
          )
        );
      }

      if (buidlerNetwork.url !== undefined) {
        errors.push(
          `BuidlerConfig.networks.${BUIDLEREVM_NETWORK_NAME} can't have an url`
        );
      }

      if (
        buidlerNetwork.blockGasLimit !== undefined &&
        typeof buidlerNetwork.blockGasLimit !== "number"
      ) {
        errors.push(
          getErrorMessage(
            `BuidlerConfig.networks.${BUIDLEREVM_NETWORK_NAME}.blockGasLimit`,
            buidlerNetwork.blockGasLimit,
            "number | undefined"
          )
        );
      }

      if (buidlerNetwork.accounts !== undefined) {
        if (Array.isArray(buidlerNetwork.accounts)) {
          for (const account of buidlerNetwork.accounts) {
            if (typeof account.privateKey !== "string") {
              errors.push(
                getErrorMessage(
                  `BuidlerConfig.networks.${BUIDLEREVM_NETWORK_NAME}.accounts[].privateKey`,
                  account.privateKey,
                  "string"
                )
              );
            }

            if (typeof account.balance !== "string") {
              errors.push(
                getErrorMessage(
                  `BuidlerConfig.networks.${BUIDLEREVM_NETWORK_NAME}.accounts[].balance`,
                  account.balance,
                  "string"
                )
              );
            }
          }
        } else {
          errors.push(
            getErrorMessage(
              `BuidlerConfig.networks.${BUIDLEREVM_NETWORK_NAME}.accounts`,
              buidlerNetwork.accounts,
              "[{privateKey: string, balance: string}] | undefined"
            )
          );
        }
      }
    }

    for (const [networkName, netConfig] of Object.entries<any>(
      config.networks
    )) {
      if (networkName === BUIDLEREVM_NETWORK_NAME) {
        continue;
      }

      if (networkName === "localhost" && netConfig.url === undefined) {
        continue;
      }

      if (typeof netConfig.url !== "string") {
        errors.push(
          getErrorMessage(
            `BuidlerConfig.networks.${networkName}.url`,
            netConfig.url,
            "string"
          )
        );
      }
    }
  }

  // io-ts can get confused if there are errors that it can't understand.
  // Especially around BuidlerEVM's config. It will treat it as an HTTPConfig,
  // and may give a loot of errors.
  if (errors.length > 0) {
    return errors;
  }

  const result = BuidlerConfig.decode(config);

  if (result.isRight()) {
    return errors;
  }

  const ioTsErrors = DotPathReporter.report(result);
  return [...errors, ...ioTsErrors];
}
