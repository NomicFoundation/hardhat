import * as fs from "fs";
import cloneDeep from "lodash/cloneDeep";
import path from "path";

import {
  HardhatConfig,
  HardhatNetworkAccountConfig,
  HardhatNetworkConfig,
  HardhatNetworkForkingConfig,
  HttpNetworkAccountsConfig,
  HttpNetworkConfig,
  NetworksConfig,
  ProjectPaths,
  SolcConfig,
  SolidityConfig,
  UserHardhatConfig,
  UserHardhatNetworkConfig,
  UserHDAccountsConfig,
  UserHttpNetworkAccountsConfig,
  UserHttpNetworkConfig,
  UserMultiSolcConfig,
  UserNetworkConfig,
  UserProjectPaths,
  UserSolcConfig,
  UserSolidityConfig,
} from "../../../types";
import { HARDHAT_NETWORK_NAME } from "../../constants";
import { fromEntries } from "../../util/lang";
import { normalizeHardhatNetworkAccountsConfig } from "../providers/util";

import {
  DEFAULT_SOLC_VERSION,
  defaultDefaultNetwork,
  defaultHardhatNetworkHdAccountsConfigParams,
  defaultHardhatNetworkParams,
  defaultHdAccountsConfigParams,
  defaultHttpNetworkParams,
  defaultLocalhostNetworkParams,
  defaultMochaOptions,
  defaultSolcOutputSelection,
} from "./default-config";

/**
 * This functions resolves the hardhat config, setting its defaults and
 * normalizing its types if necessary.
 *
 * @param userConfigPath the user config filepath
 * @param userConfig     the user config object
 *
 * @returns the resolved config
 */
export function resolveConfig(
  userConfigPath: string,
  userConfig: UserHardhatConfig
): HardhatConfig {
  userConfig = cloneDeep(userConfig);

  return {
    ...userConfig,
    defaultNetwork: userConfig.defaultNetwork ?? defaultDefaultNetwork,
    paths: resolveProjectPaths(userConfigPath, userConfig.paths),
    networks: resolveNetworksConfig(userConfig),
    solidity: resolveSolidityConfig(userConfig),
    mocha: resolveMochaConfig(userConfig),
  };
}

function resolveNetworksConfig(userConfig: UserHardhatConfig): NetworksConfig {
  const hardhatNetworkConfig =
    userConfig.networks !== undefined
      ? userConfig.networks[HARDHAT_NETWORK_NAME]
      : undefined;

  const localhostNetworkConfig =
    userConfig.networks !== undefined
      ? userConfig.networks.localhost
      : undefined;

  const hardhat = resolveHardhatNetworkConfig(hardhatNetworkConfig);
  const localhost = resolveHttpNetworkConfig({
    ...cloneDeep(defaultLocalhostNetworkParams),
    ...localhostNetworkConfig,
  });

  const otherNetworks: { [name: string]: HttpNetworkConfig } =
    userConfig.networks !== undefined
      ? fromEntries(
          Object.entries(userConfig.networks)
            .filter(
              ([name, config]) =>
                name !== "localhost" &&
                name !== "hardhat" &&
                config !== undefined &&
                isHttpNetworkConfig(config)
            )
            .map(([name, config]) => [
              name,
              resolveHttpNetworkConfig(config as UserHttpNetworkConfig),
            ])
        )
      : {};

  return {
    hardhat,
    localhost,
    ...otherNetworks,
  };
}

function isHttpNetworkConfig(
  config: UserNetworkConfig
): config is UserHttpNetworkConfig {
  return "url" in config;
}

function normalizeHexString(str: string): string {
  const normalized = str.trim().toLowerCase();
  if (normalized.startsWith("0x")) {
    return normalized;
  }

  return `0x${normalized}`;
}

function resolveHardhatNetworkConfig(
  hardhatNetworkConfig?: UserHardhatNetworkConfig
): HardhatNetworkConfig {
  if (hardhatNetworkConfig === undefined) {
    hardhatNetworkConfig = {};
  }

  const clonedDefaultHardhatNetworkParams = cloneDeep(
    defaultHardhatNetworkParams
  );

  const accounts: HardhatNetworkAccountConfig[] =
    hardhatNetworkConfig.accounts === undefined
      ? clonedDefaultHardhatNetworkParams.accounts
      : Array.isArray(hardhatNetworkConfig.accounts)
      ? hardhatNetworkConfig.accounts.map(({ privateKey, balance }) => ({
          privateKey: normalizeHexString(privateKey),
          balance,
        }))
      : normalizeHardhatNetworkAccountsConfig({
          ...defaultHardhatNetworkHdAccountsConfigParams,
          ...hardhatNetworkConfig.accounts,
          mnemonic:
            hardhatNetworkConfig.accounts.mnemonic ??
            defaultHardhatNetworkHdAccountsConfigParams.menmonic,
        });

  const forking: HardhatNetworkForkingConfig | undefined =
    hardhatNetworkConfig.forking !== undefined
      ? {
          url: hardhatNetworkConfig.forking.url,
          enabled: hardhatNetworkConfig.forking.enabled ?? true,
        }
      : undefined;

  const blockNumber = hardhatNetworkConfig?.forking?.blockNumber;
  if (blockNumber !== undefined && forking !== undefined) {
    forking.blockNumber = hardhatNetworkConfig?.forking?.blockNumber;
  }

  const config = {
    ...clonedDefaultHardhatNetworkParams,
    ...hardhatNetworkConfig,
    accounts,
    forking,
  };

  // We do it this way because ts gets lost otherwise
  if (config.forking === undefined) {
    delete config.forking;
  }

  return config;
}

function isHdAccountsConfig(
  accounts: UserHttpNetworkAccountsConfig
): accounts is UserHDAccountsConfig {
  return typeof accounts === "object" && !Array.isArray(accounts);
}

function resolveHttpNetworkConfig(
  networkConfig: UserHttpNetworkConfig
): HttpNetworkConfig {
  const accounts: HttpNetworkAccountsConfig =
    networkConfig.accounts === undefined
      ? defaultHttpNetworkParams.accounts
      : isHdAccountsConfig(networkConfig.accounts)
      ? {
          ...defaultHdAccountsConfigParams,
          ...networkConfig.accounts,
        }
      : Array.isArray(networkConfig.accounts)
      ? networkConfig.accounts.map(normalizeHexString)
      : "remote";

  return {
    ...cloneDeep(defaultHttpNetworkParams),
    ...networkConfig,
    accounts,
  };
}

function resolveSolidityConfig(userConfig: UserHardhatConfig): SolidityConfig {
  const userSolidityConfig = userConfig.solidity ?? DEFAULT_SOLC_VERSION;

  const multiSolcConfig: UserMultiSolcConfig = normalizeSolidityConfig(
    userSolidityConfig
  );

  const overrides = multiSolcConfig.overrides ?? {};

  return {
    compilers: multiSolcConfig.compilers.map(resolveCompiler),
    overrides: fromEntries(
      Object.entries(overrides).map(([name, config]) => [
        name,
        resolveCompiler(config),
      ])
    ),
  };
}

function normalizeSolidityConfig(
  solidityConfig: UserSolidityConfig
): UserMultiSolcConfig {
  if (typeof solidityConfig === "string") {
    return {
      compilers: [
        {
          version: solidityConfig,
        },
      ],
    };
  }

  if ("version" in solidityConfig) {
    return { compilers: [solidityConfig] };
  }

  return solidityConfig;
}

function resolveCompiler(compiler: UserSolcConfig): SolcConfig {
  const resolved: SolcConfig = {
    version: compiler.version,
    settings: compiler.settings ?? {},
  };

  resolved.settings.optimizer = {
    enabled: false,
    runs: 200,
    ...resolved.settings.optimizer,
  };

  if (resolved.settings.outputSelection === undefined) {
    resolved.settings.outputSelection = {};
  }

  for (const [file, contractSelection] of Object.entries(
    defaultSolcOutputSelection
  )) {
    if (resolved.settings.outputSelection[file] === undefined) {
      resolved.settings.outputSelection[file] = {};
    }

    for (const [contract, outputs] of Object.entries(contractSelection)) {
      if (resolved.settings.outputSelection[file][contract] === undefined) {
        resolved.settings.outputSelection[file][contract] = [];
      }

      for (const output of outputs) {
        if (
          !resolved.settings.outputSelection[file][contract].includes(output)
        ) {
          resolved.settings.outputSelection[file][contract].push(output);
        }
      }
    }
  }

  return resolved;
}

function resolveMochaConfig(userConfig: UserHardhatConfig): Mocha.MochaOptions {
  return {
    ...cloneDeep(defaultMochaOptions),
    ...userConfig.mocha,
  };
}

/**
 * This function resolves the ProjectPaths object from the user-provided config
 * and its path. The logic of this is not obvious and should well be document.
 * The good thing is that most users will never use this.
 *
 * Explanation:
 *    - paths.configFile is not overridable
 *    - If a path is absolute it is used "as is".
 *    - If the root path is relative, it's resolved from paths.configFile's dir.
 *    - If any other path is relative, it's resolved from paths.root.
 *    - Plugin-defined paths are not resolved, but encouraged to follow the same pattern.
 */
export function resolveProjectPaths(
  userConfigPath: string,
  userPaths: UserProjectPaths = {}
): ProjectPaths {
  const configFile = fs.realpathSync(userConfigPath);
  const configDir = path.dirname(configFile);

  const root = resolvePathFrom(configDir, "", userPaths.root);

  return {
    ...userPaths,
    root,
    configFile,
    sources: resolvePathFrom(root, "contracts", userPaths.sources),
    cache: resolvePathFrom(root, "cache", userPaths.cache),
    artifacts: resolvePathFrom(root, "artifacts", userPaths.artifacts),
    tests: resolvePathFrom(root, "test", userPaths.tests),
  };
}

function resolvePathFrom(
  from: string,
  defaultPath: string,
  relativeOrAbsolutePath: string = defaultPath
) {
  if (path.isAbsolute(relativeOrAbsolutePath)) {
    return relativeOrAbsolutePath;
  }

  return path.join(from, relativeOrAbsolutePath);
}
