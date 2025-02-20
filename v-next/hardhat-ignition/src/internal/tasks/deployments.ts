import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { IgnitionError, listDeployments } from "@nomicfoundation/ignition-core";

import { shouldBeHardhatPluginError } from "../utils/shouldBeHardhatPluginError.js";

const taskDeployments: NewTaskActionFunction<{}> = async (
  {},
  hre: HardhatRuntimeEnvironment,
) => {
  const deploymentDir = path.join(hre.config.paths.ignition, "deployments");

  try {
    const deployments = await listDeployments(deploymentDir);

    for (const deploymentId of deployments) {
      console.log(deploymentId);
    }
  } catch (e) {
    if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
      throw new HardhatError(HardhatError.ERRORS.IGNITION.INTERNAL_ERROR, e);
    }

    throw e;
  }
};

export default taskDeployments;
