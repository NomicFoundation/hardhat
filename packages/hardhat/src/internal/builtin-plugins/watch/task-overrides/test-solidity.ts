import type { WatchTestArguments } from "./test.js";
import type { TaskOverrideActionFunction } from "../../../../types/tasks.js";

import { createWatchTestAction } from "./test.js";

const watchTestSolidity: TaskOverrideActionFunction<WatchTestArguments> =
  createWatchTestAction("test solidity");

export default watchTestSolidity;
