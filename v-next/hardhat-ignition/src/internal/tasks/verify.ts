import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { verifyContract } from "@nomicfoundation/hardhat-verify/verify";

interface TaskVerifyArguments {
  deploymentId: string;
  blockscout: boolean;
  force: boolean;
}

const verifyTask: NewTaskActionFunction<TaskVerifyArguments> = async (
  { deploymentId, blockscout, force },
  hre: HardhatRuntimeEnvironment,
) => {
  const { getVerificationInformation } = await import(
    "@nomicfoundation/ignition-core"
  );

  const deploymentDir = path.join(
    hre.config.paths.ignition,
    "deployments",
    deploymentId,
  );

  for await (const contractInfo of getVerificationInformation(deploymentDir)) {
    if (typeof contractInfo === "string") {
      console.log(
        `Could not resolve contract artifacts for contract "${contractInfo}". Skipping verification.`,
      );
      console.log("");
      continue;
    }

    const connection = await hre.network.connect();

    console.log(
      `Verifying contract "${contractInfo.contract}" for network ${connection.networkName}...`,
    );

    await verifyContract(
      {
        ...contractInfo,
        force,
        provider: blockscout ? "blockscout" : "etherscan",
      },
      hre,
    );
  }
};

export default verifyTask;
