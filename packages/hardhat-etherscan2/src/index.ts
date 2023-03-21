import { extendConfig, subtask, task, types } from "hardhat/config";
import { TASK_COMPILE } from "hardhat/builtin-tasks/task-names";
import {
  TASK_VERIFY,
  TASK_VERIFY_GET_VERIFICATION_SUBTASKS,
  TASK_VERIFY_PROCESS_ARGUMENTS,
  TASK_VERIFY_VERIFY,
  TASK_VERIFY_VERIFY_ETHERSCAN,
} from "./task-names";
import { getCurrentChainConfig } from "./chain-config";
import { etherscanConfigExtender } from "./config";
import {
  MissingAddressError,
  InvalidAddressError,
  InvalidContractNameError,
  InvalidConstructorArguments,
  InvalidLibraries,
  CompilerVersionsMismatchError,
} from "./errors";
import {
  getCompilerVersions,
  isFullyQualifiedName,
  printSupportedNetworks,
  resolveConstructorArguments,
  resolveLibraries,
} from "./utilities";

import "./type-extensions";
import { Etherscan } from "./etherscan";
import { Bytecode } from "./solc/bytecode";

interface VerifyTaskArgs {
  address?: string;
  constructorArgsParams: string[];
  constructorArgs?: string;
  libraries?: string;
  contract?: string;
  listNetworks: boolean;
  noCompile: boolean;
}

interface VerificationArgs {
  address: string;
  constructorArgs: string[];
  libraries: Record<string, string>;
  contract?: string;
  listNetworks: boolean;
  noCompile: boolean;
}

extendConfig(etherscanConfigExtender);

/**
 * Main verification task.
 *
 * This is a meta-task that gets all the verification tasks and runs them.
 * Right now there's only a "verify-etherscan" task.
 */
task(TASK_VERIFY, "Verifies a contract on Etherscan")
  .addOptionalPositionalParam("address", "Address of the contract to verify")
  .addOptionalVariadicPositionalParam(
    "constructorArgsParams",
    "Contract constructor arguments. Ignored if the --constructor-args option is provided",
    []
  )
  .addOptionalParam(
    "constructorArgs",
    "Path to a Javascript module that exports the constructor arguments",
    undefined,
    types.inputFile
  )
  .addOptionalParam(
    "libraries",
    "Path to a Javascript module that exports a dictionary of library addresses. " +
      "Use if there are undetectable library addresses in your contract. " +
      "Library addresses are undetectable if they are only used in the contract constructor",
    undefined,
    types.inputFile
  )
  .addOptionalParam(
    "contract",
    "Fully qualified name of the contract to verify. Skips automatic detection of the contract. " +
      "Use if the deployed bytecode matches more than one contract in your project"
  )
  .addFlag("listNetworks", "Print the list of supported networks")
  .addFlag("noCompile", "Don't compile before running the task")
  .setAction(async (taskArgs: VerifyTaskArgs, { run }) => {
    const verificationArgs: VerificationArgs = await run(
      TASK_VERIFY_PROCESS_ARGUMENTS,
      taskArgs
    );

    const verificationSubtasks: string[] = await run(
      TASK_VERIFY_GET_VERIFICATION_SUBTASKS
    );

    for (const verificationSubtask of verificationSubtasks) {
      await run(verificationSubtask, verificationArgs);
    }
  });

subtask(TASK_VERIFY_PROCESS_ARGUMENTS)
  .addParam("address")
  .addOptionalParam("constructorArgsParams", undefined, [])
  .addOptionalParam("constructorArgs", undefined, undefined, types.inputFile)
  .addOptionalParam("libraries", undefined, undefined, types.inputFile)
  .addOptionalParam("contract")
  .setAction(
    async ({
      address,
      constructorArgsParams,
      constructorArgs: constructorArgsModule,
      contract,
      libraries: librariesModule,
      listNetworks,
      noCompile,
    }: VerifyTaskArgs): Promise<VerificationArgs> => {
      if (address === undefined) {
        throw new MissingAddressError();
      }

      const { isAddress } = await import("@ethersproject/address");
      if (!isAddress(address)) {
        throw new InvalidAddressError(address);
      }

      if (contract !== undefined && !isFullyQualifiedName(contract)) {
        throw new InvalidContractNameError(contract);
      }

      const constructorArgs = await resolveConstructorArguments(
        constructorArgsParams,
        constructorArgsModule
      );

      const libraries = await resolveLibraries(librariesModule);

      return {
        address,
        constructorArgs,
        libraries,
        contract,
        listNetworks,
        noCompile,
      };
    }
  );

/**
 * Returns a list of verification subtasks.
 */
subtask(TASK_VERIFY_GET_VERIFICATION_SUBTASKS, async (): Promise<string[]> => {
  return [TASK_VERIFY_VERIFY_ETHERSCAN];
});

/**
 * Main Etherscan verification subtask.
 *
 * Verifies a contract in Etherscan by coordinating various subtasks related
 * to contract verification.
 */
subtask(TASK_VERIFY_VERIFY_ETHERSCAN)
  .addParam("address")
  .addOptionalParam("constructorArgsParams", undefined, [])
  .addOptionalParam("constructorArgs", undefined, undefined, types.inputFile)
  .addOptionalParam("libraries", undefined, undefined, types.inputFile)
  .addOptionalParam("contract")
  .addFlag("listNetworks")
  .addFlag("noCompile")
  .setAction(
    async (
      {
        address,
        constructorArgs,
        libraries,
        contract,
        listNetworks,
        noCompile,
      }: VerificationArgs,
      { config, network, run }
    ) => {
      if (listNetworks) {
        await printSupportedNetworks(config.etherscan.customChains);
        return;
      }

      const chainConfig = await getCurrentChainConfig(
        network.provider,
        config.etherscan.customChains
      );

      const etherscan = new Etherscan(config.etherscan.apiKey, chainConfig);

      const isVerified = await etherscan.isVerified(address);
      if (isVerified) {
        console.log(`The contract ${address} has already been verified`);
        return;
      }

      const configCompilerVersions = await getCompilerVersions(config.solidity);

      const contractBytecode = await Bytecode.getDeployedContractBytecode(
        address,
        network.provider,
        network.name
      );

      const matchingCompilerVersions =
        await contractBytecode.getMatchingVersions(configCompilerVersions);
      // don't error if the bytecode appears to be OVM bytecode, because we can't infer a specific OVM solc version from the bytecode
      if (matchingCompilerVersions.length === 0 && !contractBytecode.isOvm()) {
        throw new CompilerVersionsMismatchError(
          configCompilerVersions,
          contractBytecode.getVersion(),
          network.name
        );
      }

      // Make sure that contract artifacts are up-to-date
      if (!noCompile) {
        await run(TASK_COMPILE, { quiet: true });
      }
    }
  );

/**
 * This subtask is used for backwards compatibility.
 * It validates the parameters as it is done in TASK_VERIFY_PROCESS_ARGUMENTS
 * and calls TASK_VERIFY_VERIFY_ETHERSCAN directly.
 */
subtask(TASK_VERIFY_VERIFY)
  .addParam("address")
  .addOptionalParam("constructorArguments", undefined, [])
  .addOptionalParam("libraries", undefined, {})
  .addOptionalParam("contract")
  .addFlag("noCompile")
  .setAction(
    async (
      { address, constructorArguments, libraries, contract, noCompile },
      { run }
    ) => {
      if (address === undefined) {
        throw new MissingAddressError();
      }

      const { isAddress } = await import("@ethersproject/address");
      if (!isAddress(address)) {
        throw new InvalidAddressError(address);
      }

      if (contract !== undefined && !isFullyQualifiedName(contract)) {
        throw new InvalidContractNameError(contract);
      }

      // This can only happen if the subtask is invoked from within Hardhat by a user script or another task.
      if (!Array.isArray(constructorArguments)) {
        throw new InvalidConstructorArguments();
      }

      if (typeof libraries !== "object" || Array.isArray(libraries)) {
        throw new InvalidLibraries();
      }

      await run(TASK_VERIFY_VERIFY_ETHERSCAN, {
        address,
        constructorArgsParams: constructorArguments,
        libraryDictionary: libraries,
        contract,
        noCompile,
      });
    }
  );
