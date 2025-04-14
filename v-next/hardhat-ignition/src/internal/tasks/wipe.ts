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

  await wipe(
    deploymentDir,
    new HardhatArtifactResolver(hre.artifacts),
    futureId,
  );

  console.log(`${futureId} state has been cleared`);
};

export default taskWipe;
