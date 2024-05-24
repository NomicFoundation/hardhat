import { getHardhatRuntimeEnvironmentSingleton } from "./internal/hre-singleton.js";

// TODO:
//  - Load the config from the file system.
const hre = await getHardhatRuntimeEnvironmentSingleton({});

export const { config, tasks, globalArguments, hooks, interruptions } = hre;

export default hre;
