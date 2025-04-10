import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { status } from "@nomicfoundation/ignition-core";

import { HardhatArtifactResolver } from "../../helpers/hardhat-artifact-resolver.js";
import { calculateDeploymentStatusDisplay } from "../ui/helpers/calculate-deployment-status-display.js";

interface TaskStatusArguments {
  deploymentId: string;
}

const taskStatus: NewTaskActionFunction<TaskStatusArguments> = async (
  { deploymentId },
  hre: HardhatRuntimeEnvironment,
) => {
  const deploymentDir = path.join(
    hre.config.paths.ignition,
    "deployments",
    deploymentId,
  );

  const artifactResolver = new HardhatArtifactResolver(hre.artifacts);

  const statusResult = await status(deploymentDir, artifactResolver);

  console.log(calculateDeploymentStatusDisplay(deploymentId, statusResult));
};

export default taskStatus;
