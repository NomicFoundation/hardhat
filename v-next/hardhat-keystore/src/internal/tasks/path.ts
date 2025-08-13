import type { KeystoreConsoleLog } from "../types.js";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

interface TaskPathArguments {
  dev: boolean;
}

const taskPath: NewTaskActionFunction<TaskPathArguments> = async (
  args,
  hre: HardhatRuntimeEnvironment,
): Promise<void> => {
  await path(args, hre);
};

export const path = async (
  { dev }: TaskPathArguments,
  hre: HardhatRuntimeEnvironment,
  consoleLog: KeystoreConsoleLog = console.log,
): Promise<void> => {
  const keystoreFilePath = dev
    ? hre.config.keystore.devFilePath
    : hre.config.keystore.filePath;

  consoleLog(keystoreFilePath);
};

export default taskPath;
