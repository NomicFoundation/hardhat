import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";

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
  _deployArgs,
  _hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  console.log("Deploying contract with Ignition ...");
};

export default taskDeploy;
