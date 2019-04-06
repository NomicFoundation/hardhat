import { BuidlerRuntimeEnvironment } from "../types";

import { BuidlerContext } from "./context";
import { ExtenderManager } from "./core/config/extenders";
import { TasksDSL } from "./core/tasks/dsl";

export interface BuidlerContext {
  env: BuidlerRuntimeEnvironment;
  tasksDSL: TasksDSL;
  extendersManager: ExtenderManager;
}

export type GlobalWithBuidlerContext = NodeJS.Global & {
  __buidlerContext: BuidlerContext;
};
