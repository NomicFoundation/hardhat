import { task } from "../internal/core/config/config-env";

import { TASK_DEPLOY } from "./task-names";

task(TASK_DEPLOY, "Deploy your contracts").setAction(async () => {});
