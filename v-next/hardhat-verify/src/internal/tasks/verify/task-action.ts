import type { VerifyActionArgs } from "./types.js";
import type { VerificationProvidersConfig } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { capitalize } from "@nomicfoundation/hardhat-utils/string";
import chalk from "chalk";

import { verifyContract } from "../../verification.js";
import { resolveConstructorArgs, resolveLibraries } from "../arg-resolution.js";

const verifyAction: NewTaskActionFunction<VerifyActionArgs> = async (
  verifyActionArgs,
  hre,
) => {
  await internalVerifyAction(verifyActionArgs, hre, verifyContract);
};

export async function internalVerifyAction(
  {
    constructorArgs,
    constructorArgsPath,
    librariesPath,
    ...verifyActionArgs
  }: VerifyActionArgs,
  hre: HardhatRuntimeEnvironment,
  verifyContractFn: typeof verifyContract,
): Promise<void> {
  const allProviders: Array<keyof VerificationProvidersConfig> = [
    "etherscan",
    "blockscout",
    "sourcify",
  ];

  const enabledProviders = allProviders.filter(
    (provider) => hre.config.verify[provider].enabled,
  );

  if (enabledProviders.length === 0) {
    console.warn(chalk.yellow("\n⚠️  No verification providers are enabled."));
    process.exitCode = 0;
    return;
  }

  const resolvedConstructorArgs = await resolveConstructorArgs(
    constructorArgs ?? [],
    constructorArgsPath,
  );

  const resolvedLibraries = await resolveLibraries(librariesPath);

  let errorOccurred = false;
  for (const provider of enabledProviders) {
    try {
      console.log(chalk.cyan.bold(`\n=== ${capitalize(provider)} ===`));
      await verifyContractFn(
        {
          ...verifyActionArgs,
          constructorArgs: resolvedConstructorArgs,
          libraries: resolvedLibraries,
          provider,
        },
        hre,
      );
    } catch (error) {
      ensureError(error);
      // It would be nice to use printErrorMessages
      // from v-next/hardhat/src/internal/cli/error-handler.ts
      // for consistent error formatting
      console.error(chalk.red(error.message));
      errorOccurred = true;
    }
  }

  process.exitCode = errorOccurred ? 1 : 0;
}

export default verifyAction;
