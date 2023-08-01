import type { JsonFragment } from "@ethersproject/abi";
import type { SolidityConfig } from "hardhat/types";
import type { ChainConfig } from "../types";

import chalk from "chalk";
import path from "path";
import { builtinChains } from "./chain-config";
import {
  ABIArgumentLengthError,
  ABIArgumentOverflowError,
  ABIArgumentTypeError,
  EtherscanVersionNotSupportedError,
  ExclusiveConstructorArgumentsError,
  ImportingModuleError,
  InvalidConstructorArgumentsModuleError,
  InvalidLibrariesModuleError,
} from "./errors";

import { LibraryToAddress } from "./solc/artifacts";
import {
  isABIArgumentLengthError,
  isABIArgumentOverflowError,
  isABIArgumentTypeError,
} from "./abi-validation-extras";

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Prints a table of networks supported by hardhat-verify, including both
 * built-in and custom networks.
 */
export async function printSupportedNetworks(
  customChains: ChainConfig[]
): Promise<void> {
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
Networks supported by hardhat-verify:

${supportedNetworksTable}

Custom networks added by you or by plugins:

${customNetworksTable}

To learn how to add custom networks, follow these instructions: https://hardhat.org/verify-custom-networks
`.trimStart()
  );
}

/**
 * Returns the list of constructor arguments from the constructorArgsModule
 * or the constructorArgsParams if the first is not defined.
 */
export async function resolveConstructorArguments(
  constructorArgsParams: string[],
  constructorArgsModule?: string
): Promise<string[]> {
  if (constructorArgsModule === undefined) {
    return constructorArgsParams;
  }

  if (constructorArgsParams.length > 0) {
    throw new ExclusiveConstructorArgumentsError();
  }

  const constructorArgsModulePath = path.resolve(
    process.cwd(),
    constructorArgsModule
  );

  try {
    const constructorArguments = (await import(constructorArgsModulePath))
      .default;

    if (!Array.isArray(constructorArguments)) {
      throw new InvalidConstructorArgumentsModuleError(
        constructorArgsModulePath
      );
    }

    return constructorArguments;
  } catch (error: any) {
    throw new ImportingModuleError("constructor arguments list", error);
  }
}

/**
 * Returns a dictionary of library addresses from the librariesModule or
 * an empty object if not defined.
 */
export async function resolveLibraries(
  librariesModule?: string
): Promise<LibraryToAddress> {
  if (librariesModule === undefined) {
    return {};
  }

  const librariesModulePath = path.resolve(process.cwd(), librariesModule);

  try {
    const libraries = (await import(librariesModulePath)).default;

    if (typeof libraries !== "object" || Array.isArray(libraries)) {
      throw new InvalidLibrariesModuleError(librariesModulePath);
    }

    return libraries;
  } catch (error: any) {
    throw new ImportingModuleError("libraries dictionary", error);
  }
}

/**
 * Retrieves the list of Solidity compiler versions for a given Solidity
 * configuration.
 * It checks that the versions are supported by Etherscan, and throws an
 * error if any are not.
 */
export async function getCompilerVersions({
  compilers,
  overrides,
}: SolidityConfig): Promise<string[]> {
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
}

/**
 * Encodes the constructor arguments for a given contract.
 */
export async function encodeArguments(
  abi: JsonFragment[],
  sourceName: string,
  contractName: string,
  constructorArguments: any[]
): Promise<string> {
  const { Interface } = await import("@ethersproject/abi");

  const contractInterface = new Interface(abi);
  let encodedConstructorArguments;
  try {
    encodedConstructorArguments = contractInterface
      .encodeDeploy(constructorArguments)
      .replace("0x", "");
  } catch (error) {
    if (isABIArgumentLengthError(error)) {
      throw new ABIArgumentLengthError(sourceName, contractName, error);
    }
    if (isABIArgumentTypeError(error)) {
      throw new ABIArgumentTypeError(error);
    }
    if (isABIArgumentOverflowError(error)) {
      throw new ABIArgumentOverflowError(error);
    }

    // Should be unreachable.
    throw error;
  }

  return encodedConstructorArguments;
}
