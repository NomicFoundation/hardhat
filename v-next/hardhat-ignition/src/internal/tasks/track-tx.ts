import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { trackTransaction } from "@nomicfoundation/ignition-core";

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

  const connection = await hre.network.connect();

  let output: string | void;
  try {
    output = await trackTransaction(
      deploymentDir,
      txHash,
      connection.provider,
      hre.config.ignition.requiredConfirmations,
    );
  } catch (e) {
    // Disabled for the alpha release
    // if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
    //   throw new NomicLabsHardhatPluginError(
    //     "hardhat-ignition",
    //     e.message,
    //     e
    //   );
    // }

    throw e;
  }

  console.log(
    output ??
      `Thanks for providing the transaction hash, your deployment has been fixed.

Now you can re-run Hardhat Ignition to continue with your deployment.`,
  );
};

export default taskTransactions;
