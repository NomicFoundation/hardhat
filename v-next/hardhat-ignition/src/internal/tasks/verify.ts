import type { VerificationProvidersConfig } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { capitalize } from "@nomicfoundation/hardhat-utils/string";
import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import { getVerificationInformation } from "@nomicfoundation/ignition-core";
import chalk from "chalk";

interface TaskVerifyArguments {
  deploymentId: string;
  force: boolean;
}

const verifyTask: NewTaskActionFunction<TaskVerifyArguments> = async (
  { deploymentId, force },
  hre: HardhatRuntimeEnvironment,
) => {
  await internalVerifyAction({ deploymentId, force }, hre, verifyContract, getVerificationInformation);
};

export async function internalVerifyAction(
  { deploymentId, force }: TaskVerifyArguments,
  hre: HardhatRuntimeEnvironment,
  verifyContractFn: typeof verifyContract,
  getVerificationInformationFn: typeof getVerificationInformation,
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
    return;
  }

  const deploymentDir = path.join(
    hre.config.paths.ignition,
    "deployments",
    deploymentId,
  );

  const connection = await hre.network.connect();

  for await (const contractInfo of getVerificationInformationFn(deploymentDir)) {
    if (typeof contractInfo === "string") {
      console.log(
        `Could not resolve contract artifacts for contract "${contractInfo}". Skipping verification.`,
      );
      console.log("");
      continue;
    }

    console.log(
      `Verifying contract "${contractInfo.contract}" for network ${connection.networkName}...`,
    );

    for (const provider of enabledProviders) {
      try {
        console.log(chalk.cyan.bold(`\n=== ${capitalize(provider)} ===`));
        await verifyContractFn(
          {
            ...contractInfo,
            force,
            provider,
          },
          hre,
        );
      } catch (error) {
        ensureError(error);
        console.error(chalk.red(error.message));
      }
    }
  }
}

export default verifyTask;
