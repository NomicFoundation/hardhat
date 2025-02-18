import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";
import type { StatusResult } from "@ignored/hardhat-vnext-ignition-core";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { IgnitionError, status } from "@ignored/hardhat-vnext-ignition-core";

import { HardhatArtifactResolver } from "../../helpers/hardhat-artifact-resolver.js";
import { calculateDeploymentStatusDisplay } from "../ui/helpers/calculate-deployment-status-display.js";
import { shouldBeHardhatPluginError } from "../utils/shouldBeHardhatPluginError.js";

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

  let statusResult: StatusResult;
  try {
    statusResult = await status(deploymentDir, artifactResolver);
  } catch (e) {
    if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
      throw new HardhatError(HardhatError.ERRORS.IGNITION.INTERNAL_ERROR, e);
    }

    throw e;
  }

  console.log(calculateDeploymentStatusDisplay(deploymentId, statusResult));
};

export default taskStatus;
