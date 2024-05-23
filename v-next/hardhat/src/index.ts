import { getHRE } from "./internal/hre-singleton.js";

// TODO:
//  - Load the config from the file system.
const hre = await getHRE({});

export const { config, tasks, globalArguments, hooks, interruptions } = hre;

export default hre;
