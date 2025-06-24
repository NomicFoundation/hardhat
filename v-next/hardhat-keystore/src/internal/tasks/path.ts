import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

const taskList: NewTaskActionFunction = async (
  _taskArguments,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  await path(hre);
};

export const path = async (
  hre: HardhatRuntimeEnvironment,
  consoleLog: (text: string) => void = console.log,
): Promise<void> => {
  const keystoreFilePath = hre.config.keystore.filePath;

  consoleLog(keystoreFilePath);
};

export default taskList;
