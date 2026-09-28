import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { trackTransaction } from "@nomicfoundation/ignition-core";

import { verifyArtifactsVersion } from "../utils/verifyArtifactsVersion.js";

interface TrackTxArguments {
  txHash: string;
  deploymentId: string;
}

const taskTransactions: NewTaskActionFunction<TrackTxArguments> = async (
  { txHash, deploymentId },
  hre: HardhatRuntimeEnvironment,
) => {
  const deploymentDir = path.join(
    hre.config.paths.ignition,
    "deployments",
    deploymentId,
  );

  await verifyArtifactsVersion(deploymentDir);

  const connection = await hre.network.create();

  try {
    const output = await trackTransaction(
      deploymentDir,
      txHash,
      connection.provider,
      hre.config.ignition.requiredConfirmations,
    );

    console.log(
      output ??
        `Thanks for providing the transaction hash, your deployment has been fixed.

Now you can re-run Hardhat Ignition to continue with your deployment.`,
    );
  } finally {
    // Plugins can hold resources open on the connection until it is closed,
    // and Hardhat never closes connections on its own.
    await connection.close();
  }
};

export default taskTransactions;
