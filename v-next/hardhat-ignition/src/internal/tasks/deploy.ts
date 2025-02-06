import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

interface TaskDeployArguments {
  modulePath: string;
  parameters: string;
  deploymentId: string;
  defaultSender: string;
  strategy: string;
  reset: boolean;
  verify: boolean;
  writeLocalhostDeployment: boolean;
}

const taskDeploy: NewTaskActionFunction<TaskDeployArguments> = async (
  deployArgs,
  _hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  if (deployArgs.verify) {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message:
        "Verifying deployments is not available yet. It will be available in a future version of the Harhdat 3 Alpha",
    });
  }
};

export default taskDeploy;
