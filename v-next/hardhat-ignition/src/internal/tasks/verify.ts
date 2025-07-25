import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";
import { getVerificationInformation } from "@nomicfoundation/ignition-core";

interface TaskVerifyArguments {
  deploymentId: string;
  force: boolean;
}

const verifyTask: NewTaskActionFunction<TaskVerifyArguments> = async (
  { deploymentId, force },
  hre: HardhatRuntimeEnvironment,
) => {
  const deploymentDir = path.join(
    hre.config.paths.ignition,
    "deployments",
    deploymentId,
  );

  const connection = await hre.network.connect();

  for await (const contractInfo of getVerificationInformation(deploymentDir)) {
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

    await verifyContract(
      {
        ...contractInfo,
        force,
        provider: "etherscan",
      },
      hre,
    );
  }
};

export default verifyTask;
