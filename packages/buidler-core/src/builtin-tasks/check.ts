import { task } from "../internal/core/config/config-env";

import { TASK_CHECK } from "./task-names";

export default function() {
  task(TASK_CHECK, "Check whatever you need", async () => {});
}
