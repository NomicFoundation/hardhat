import {
  importUserConfig,
  resolveConfigPath,
} from "./internal/helpers/config-loading.js";
import { getHardhatRuntimeEnvironmentSingleton } from "./internal/hre-singleton.js";

const configPath = await resolveConfigPath();
const userConfig = await importUserConfig(configPath);

const hre = await getHardhatRuntimeEnvironmentSingleton(userConfig);

export const { config, tasks, globalOptions, hooks, interruptions } = hre;

export default hre;
