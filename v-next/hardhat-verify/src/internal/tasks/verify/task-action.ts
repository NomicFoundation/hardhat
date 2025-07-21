import type { VerifyActionArgs } from "./types.js";
import type { VerificationProvidersConfig } from "hardhat/types/config";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { capitalize } from "@nomicfoundation/hardhat-utils/string";

import { verifyContract } from "../../verification.js";
import { resolveConstructorArgs, resolveLibraries } from "../arg-resolution.js";

const verifyAction: NewTaskActionFunction<VerifyActionArgs> = async (
  { constructorArgs, constructorArgsPath, librariesPath, ...verifyActionArgs },
  hre,
) => {
  const allProviders: Array<keyof VerificationProvidersConfig> = [
    "etherscan",
    "blockscout",
  ];

  const enabledProviders = allProviders.filter(
    (provider) => hre.config.verify[provider].enabled,
  );

  if (enabledProviders.length === 0) {
    console.warn("⚠️ No verification providers are enabled");
    return;
  }

  const resolvedConstructorArgs = await resolveConstructorArgs(
    constructorArgs,
    constructorArgsPath,
  );

  const resolvedLibraries = await resolveLibraries(librariesPath);

  let errorOccurred = false;
  enabledProviders.forEach(async (provider) => {
    try {
      console.log(`=== ${capitalize(provider)} ===`);
      await verifyContract(
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
      console.error(error.message);
      errorOccurred = true;
    }
  });

  if (errorOccurred) {
    process.exitCode = 1;
  }
};

export default verifyAction;
