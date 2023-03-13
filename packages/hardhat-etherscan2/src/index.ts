import chalk from "chalk";
import { extendConfig, subtask, task, types } from "hardhat/config";
import {
  TASK_VERIFY,
  TASK_VERIFY_GET_VERIFICATION_SUBTASKS,
  TASK_VERIFY_VERIFY_ETHERSCAN,
} from "./task-names";
import "./type-extensions";
import { EtherscanConfig } from "./types";

interface VerificationArgs {
  address?: string;
  constructorArgsParams: string[];
  constructorArgs?: string;
  libraries?: string;
  contract?: string;
  listNetworks: boolean;
  noCompile: boolean;
}

extendConfig((config, userConfig) => {
  const defaultConfig: EtherscanConfig = {
    apiKey: "",
    customChains: [],
  };

  if (userConfig.etherscan !== undefined) {
    const cloneDeep = require("lodash.clonedeep");
    const customConfig = cloneDeep(userConfig.etherscan);

    config.etherscan = { ...defaultConfig, ...customConfig };
  } else {
    config.etherscan = defaultConfig;

    // check that there is no etherscan entry in the networks object, since
    // this is a common mistake done by users
    if (config.networks?.etherscan !== undefined) {
      console.warn(
        chalk.yellow(
          "WARNING: you have an 'etherscan' entry in your networks configuration. This is likely a mistake. The etherscan configuration should be at the root of the configuration, not within the networks object."
        )
      );
    }
  }
});

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
  .setAction(async (verificationArgs: VerificationArgs, { run }) => {
    const verificationSubtasks: string[] = await run(
      TASK_VERIFY_GET_VERIFICATION_SUBTASKS
    );

    for (const verificationSubtask of verificationSubtasks) {
      await run(verificationSubtask, verificationArgs);
    }
  });

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
  .addOptionalPositionalParam("address")
  .addOptionalVariadicPositionalParam("constructorArgsParams", undefined, [])
  .addOptionalParam("constructorArgs")
  .addOptionalParam("libraries")
  .addOptionalParam("contract")
  .addFlag("listNetworks")
  .addFlag("noCompile")
  .setAction(async (verificationArgs: VerificationArgs, { run }) => {});
