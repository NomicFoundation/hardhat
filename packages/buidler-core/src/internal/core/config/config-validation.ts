import * as t from "io-ts";
import { Context, getFunctionName, ValidationError } from "io-ts/lib";
import { Reporter } from "io-ts/lib/Reporter";

import {
  HARDHAT_NETWORK_NAME,
  HARDHAT_NETWORK_SUPPORTED_HARDFORKS,
} from "../../constants";
import { HardhatError } from "../errors";
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
    .map((c) => c.key)
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
  report: (validation) => validation.fold(failure, success),
};

function optional<TypeT, OutputT>(
  codec: t.Type<TypeT, OutputT, unknown>,
  name: string = `${codec.name} | undefined`
): t.Type<TypeT | undefined, OutputT | undefined, unknown> {
  return new t.Type(
    name,
    (u: unknown): u is TypeT | undefined => u === undefined || codec.is(u),
    (u, c) => (u === undefined ? t.success(u) : codec.validate(u, c)),
    (a) => (a === undefined ? undefined : codec.encode(a))
  );
}

// IMPORTANT: This t.types MUST be kept in sync with the actual types.

const HardhatNetworkAccount = t.type({
  privateKey: t.string,
  balance: t.string,
});

const HDAccountsConfig = t.type({
  mnemonic: t.string,
  initialIndex: optional(t.number),
  count: optional(t.number),
  path: optional(t.string),
});

const HardhatNetworkHDAccountsConfig = t.type({
  mnemonic: t.string,
  initialIndex: optional(t.number),
  count: optional(t.number),
  path: optional(t.string),
  accountsBalance: optional(t.string),
});

const HardhatNetworkConfig = t.type({
  hardfork: optional(t.string),
  chainId: optional(t.number),
  from: optional(t.string),
  gas: optional(t.union([t.literal("auto"), t.number])),
  gasPrice: optional(t.union([t.literal("auto"), t.number])),
  gasMultiplier: optional(t.number),
  accounts: optional(
    t.union([t.array(HardhatNetworkAccount), HardhatNetworkHDAccountsConfig])
  ),
  blockGasLimit: optional(t.number),
  throwOnTransactionFailures: optional(t.boolean),
  throwOnCallFailures: optional(t.boolean),
  loggingEnabled: optional(t.boolean),
  allowUnlimitedContractSize: optional(t.boolean),
  initialDate: optional(t.string),
});

const OtherAccountsConfig = t.type({
  type: t.string,
});

const NetworkConfigAccounts = t.union([
  t.literal("remote"),
  t.array(t.string),
  HDAccountsConfig,
  OtherAccountsConfig,
]);

const HttpHeaders = t.record(t.string, t.string, "httpHeaders");

const HttpNetworkConfig = t.type({
  chainId: optional(t.number),
  from: optional(t.string),
  gas: optional(t.union([t.literal("auto"), t.number])),
  gasPrice: optional(t.union([t.literal("auto"), t.number])),
  gasMultiplier: optional(t.number),
  url: optional(t.string),
  accounts: optional(NetworkConfigAccounts),
  httpHeaders: optional(HttpHeaders),
});

const NetworkConfig = t.union([HardhatNetworkConfig, HttpNetworkConfig]);

const Networks = t.record(t.string, NetworkConfig);

const ProjectPaths = t.type({
  root: optional(t.string),
  cache: optional(t.string),
  artifacts: optional(t.string),
  sources: optional(t.string),
  tests: optional(t.string),
});

const SingleSolcConfig = t.type({
  version: t.string,
  settings: optional(t.any),
});

const MultiSolcConfig = t.type({
  compilers: t.array(SingleSolcConfig),
  overrides: optional(t.record(t.string, SingleSolcConfig)),
});

const SolidityConfig = t.union([t.string, SingleSolcConfig, MultiSolcConfig]);

const AnalyticsConfig = t.type({
  enabled: optional(t.boolean),
});

const HardhatConfig = t.type(
  {
    defaultNetwork: optional(t.string),
    networks: optional(Networks),
    paths: optional(ProjectPaths),
    solidity: optional(SolidityConfig),
    analytics: optional(AnalyticsConfig),
  },
  "HardhatConfig"
);

/**
 * Validates the config, throwing a HardhatError if invalid.
 * @param config
 */
export function validateConfig(config: any) {
  const errors = getValidationErrors(config);

  if (errors.length === 0) {
    return;
  }

  let errorList = errors.join("\n  * ");
  errorList = `  * ${errorList}`;

  throw new HardhatError(ERRORS.GENERAL.INVALID_CONFIG, { errors: errorList });
}

export function getValidationErrors(config: any): string[] {
  const errors = [];

  // These can't be validated with io-ts
  if (config !== undefined && typeof config.networks === "object") {
    const hardhatNetwork = config.networks[HARDHAT_NETWORK_NAME];
    if (hardhatNetwork !== undefined) {
      if (
        hardhatNetwork.hardfork !== undefined &&
        !HARDHAT_NETWORK_SUPPORTED_HARDFORKS.includes(hardhatNetwork.hardfork)
      ) {
        errors.push(
          `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.hardfork is not supported. Use one of ${HARDHAT_NETWORK_SUPPORTED_HARDFORKS.join(
            ", "
          )}`
        );
      }

      if (
        hardhatNetwork.allowUnlimitedContractSize !== undefined &&
        typeof hardhatNetwork.allowUnlimitedContractSize !== "boolean"
      ) {
        errors.push(
          getErrorMessage(
            `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.allowUnlimitedContractSize`,
            hardhatNetwork.allowUnlimitedContractSize,
            "boolean | undefined"
          )
        );
      }

      if (
        hardhatNetwork.initialDate !== undefined &&
        typeof hardhatNetwork.initialDate !== "string"
      ) {
        errors.push(
          getErrorMessage(
            `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.initialDate`,
            hardhatNetwork.initialDate,
            "string | undefined"
          )
        );
      }

      if (
        hardhatNetwork.throwOnTransactionFailures !== undefined &&
        typeof hardhatNetwork.throwOnTransactionFailures !== "boolean"
      ) {
        errors.push(
          getErrorMessage(
            `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.throwOnTransactionFailures`,
            hardhatNetwork.throwOnTransactionFailures,
            "boolean | undefined"
          )
        );
      }

      if (
        hardhatNetwork.throwOnCallFailures !== undefined &&
        typeof hardhatNetwork.throwOnCallFailures !== "boolean"
      ) {
        errors.push(
          getErrorMessage(
            `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.throwOnCallFailures`,
            hardhatNetwork.throwOnCallFailures,
            "boolean | undefined"
          )
        );
      }

      if (hardhatNetwork.url !== undefined) {
        errors.push(
          `HardhatConfig.networks.${HARDHAT_NETWORK_NAME} can't have an url`
        );
      }

      if (
        hardhatNetwork.blockGasLimit !== undefined &&
        typeof hardhatNetwork.blockGasLimit !== "number"
      ) {
        errors.push(
          getErrorMessage(
            `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.blockGasLimit`,
            hardhatNetwork.blockGasLimit,
            "number | undefined"
          )
        );
      }

      if (
        hardhatNetwork.chainId !== undefined &&
        typeof hardhatNetwork.chainId !== "number"
      ) {
        errors.push(
          getErrorMessage(
            `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.chainId`,
            hardhatNetwork.chainId,
            "number | undefined"
          )
        );
      }

      if (
        hardhatNetwork.loggingEnabled !== undefined &&
        typeof hardhatNetwork.loggingEnabled !== "boolean"
      ) {
        errors.push(
          getErrorMessage(
            `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.loggingEnabled`,
            hardhatNetwork.loggingEnabled,
            "boolean | undefined"
          )
        );
      }

      if (Array.isArray(hardhatNetwork.accounts)) {
        for (const account of hardhatNetwork.accounts) {
          if (typeof account.privateKey !== "string") {
            errors.push(
              getErrorMessage(
                `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.accounts[].privateKey`,
                account.privateKey,
                "string"
              )
            );
          }

          if (typeof account.balance !== "string") {
            errors.push(
              getErrorMessage(
                `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.accounts[].balance`,
                account.balance,
                "string"
              )
            );
          }
        }
      } else if (typeof hardhatNetwork.accounts === "object") {
        const hdConfigResult = HardhatNetworkHDAccountsConfig.decode(
          hardhatNetwork.accounts
        );
        if (hdConfigResult.isLeft()) {
          errors.push(
            getErrorMessage(
              `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.accounts`,
              hardhatNetwork.accounts,
              "[{privateKey: string, balance: string}] | HardhatNetworkHDAccountsConfig | undefined"
            )
          );
        }
      } else if (hardhatNetwork.accounts !== undefined) {
        errors.push(
          getErrorMessage(
            `HardhatConfig.networks.${HARDHAT_NETWORK_NAME}.accounts`,
            hardhatNetwork.accounts,
            "[{privateKey: string, balance: string}] | HardhatNetworkHDAccountsConfig | undefined"
          )
        );
      }
    }

    for (const [networkName, netConfig] of Object.entries<any>(
      config.networks
    )) {
      if (networkName === HARDHAT_NETWORK_NAME) {
        continue;
      }

      if (networkName === "localhost" && netConfig.url === undefined) {
        continue;
      }

      if (typeof netConfig.url !== "string") {
        errors.push(
          getErrorMessage(
            `HardhatConfig.networks.${networkName}.url`,
            netConfig.url,
            "string"
          )
        );
      }

      const netConfigResult = HttpNetworkConfig.decode(netConfig);
      if (netConfigResult.isLeft()) {
        errors.push(
          getErrorMessage(
            `HardhatConfig.networks.${networkName}`,
            netConfig,
            "HttpNetworkConfig"
          )
        );
      }
    }
  }

  // io-ts can get confused if there are errors that it can't understand.
  // Especially around Hardhat Network's config. It will treat it as an HTTPConfig,
  // and may give a loot of errors.
  if (errors.length > 0) {
    return errors;
  }

  const result = HardhatConfig.decode(config);

  if (result.isRight()) {
    return errors;
  }

  const ioTsErrors = DotPathReporter.report(result);
  return [...errors, ...ioTsErrors];
}
