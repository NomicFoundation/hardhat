import { createHardhatRuntimeEnvironment } from "./hre.js";

// TODO:
//  - If the HRE was already initialized in the CLI, we should use that one.
//  - Load the config from the file system.
const hre = await createHardhatRuntimeEnvironment({});

export const { config, tasks, globalArguments, hooks, interruptions } = hre;

export default hre;
