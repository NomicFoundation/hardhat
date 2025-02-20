import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { wipe } from "@nomicfoundation/ignition-core";

import { HardhatArtifactResolver } from "../../helpers/hardhat-artifact-resolver.js";

interface TaskWipeArguments {
  deploymentId: string;
  futureId: string;
}

const taskWipe: NewTaskActionFunction<TaskWipeArguments> = async (
  { deploymentId, futureId },
  hre: HardhatRuntimeEnvironment,
) => {
  const deploymentDir = path.join(
    hre.config.paths.ignition,
    "deployments",
    deploymentId,
  );

  try {
    await wipe(
      deploymentDir,
      new HardhatArtifactResolver(hre.artifacts),
      futureId,
    );
  } catch (e) {
    // Disabled for the alpha release
    // if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
    //   throw new HardhatError(HardhatError.ERRORS.IGNITION.INTERNAL_ERROR, e);
    // }

    throw e;
  }

  console.log(`${futureId} state has been cleared`);
};

export default taskWipe;
