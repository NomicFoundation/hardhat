import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { listDeployments } from "@nomicfoundation/ignition-core";

const taskDeployments: NewTaskActionFunction<{}> = async (
  {},
  hre: HardhatRuntimeEnvironment,
) => {
  const deploymentDir = path.join(hre.config.paths.ignition, "deployments");

  const deployments = await listDeployments(deploymentDir);

  for (const deploymentId of deployments) {
    console.log(deploymentId);
  }
};

export default taskDeployments;
