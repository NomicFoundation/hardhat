import chalk from "chalk";
import path from "path";
import { SolidityConfig } from "hardhat/types";
import { builtinChains } from "./chain-config";
import {
  EtherscanVersionNotSupportedError,
  ImportingModuleError,
  InvalidConstructorArgumentsModule,
  InvalidLibrariesModule,
} from "./errors";

import { ChainConfig } from "./types";
import { LibraryToAddress } from "./solc/artifacts";

export const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Prints a table of networks supported by hardhat-etherscan, including both
 * built-in and custom networks.
 */
export const printSupportedNetworks = async (customChains: ChainConfig[]) => {
  const { table } = await import("table");

  // supported networks
  const supportedNetworks = builtinChains.map(({ network, chainId }) => [
    network,
    chainId,
  ]);

  const supportedNetworksTable = table([
    [chalk.bold("network"), chalk.bold("chain id")],
    ...supportedNetworks,
  ]);

  // custom networks
  const customNetworks = customChains.map(({ network, chainId }) => [
    network,
    chainId,
  ]);

  const customNetworksTable =
    customNetworks.length > 0
      ? table([
          [chalk.bold("network"), chalk.bold("chain id")],
          ...customNetworks,
        ])
      : table([["No custom networks were added"]]);

  // print message
  console.log(
    `
Networks supported by hardhat-etherscan:

${supportedNetworksTable}

Custom networks added by you or by plugins:

${customNetworksTable}

To learn how to add custom networks, follow these instructions: https://hardhat.org/verify-custom-networks
`.trimStart()
  );
};

/**
 * Returns the list of constructor arguments from the constructorArgsModule
 * or the constructorArgsParams if the first is not defined.
 */
export const resolveConstructorArguments = async (
  constructorArgsParams: string[],
  constructorArgsModule?: string
) => {
  if (constructorArgsModule === undefined) {
    return constructorArgsParams;
  }

  const constructorArgsModulePath = path.resolve(
    process.cwd(),
    constructorArgsModule
  );

  try {
    const constructorArguments = (await import(constructorArgsModulePath))
      .default;

    if (!Array.isArray(constructorArguments)) {
      throw new InvalidConstructorArgumentsModule(constructorArgsModulePath);
    }

    return constructorArguments;
  } catch (error: any) {
    throw new ImportingModuleError("constructor arguments list", error);
  }
};

/**
 * Returns a dictionary of library addresses from the librariesModule or
 * an empty object if not defined.
 */
export const resolveLibraries = async (
  librariesModule?: string
): Promise<LibraryToAddress> => {
  if (librariesModule === undefined) {
    return {};
  }

  const librariesModulePath = path.resolve(process.cwd(), librariesModule);

  try {
    const libraries = (await import(librariesModulePath)).default;

    if (typeof libraries !== "object" || Array.isArray(libraries)) {
      throw new InvalidLibrariesModule(librariesModulePath);
    }

    return libraries;
  } catch (error: any) {
    throw new ImportingModuleError("libraries dictionary", error);
  }
};

/**
 * Retrieves the list of Solidity compiler versions for a given Solidity
 * configuration.
 * It checks that the versions are supported by Etherscan, and throws an
 * error if any are not.
 */
export const getCompilerVersions = async ({
  compilers,
  overrides,
}: SolidityConfig) => {
  {
    const compilerVersions = compilers.map(({ version }) => version);
    if (overrides !== undefined) {
      for (const { version } of Object.values(overrides)) {
        compilerVersions.push(version);
      }
    }

    // Etherscan only supports solidity versions higher than or equal to v0.4.11.
    // See https://etherscan.io/solcversions
    const supportedSolcVersionRange = ">=0.4.11";
    const semver = await import("semver");
    if (
      compilerVersions.some(
        (version) => !semver.satisfies(version, supportedSolcVersionRange)
      )
    ) {
      throw new EtherscanVersionNotSupportedError();
    }

    return compilerVersions;
  }
};
