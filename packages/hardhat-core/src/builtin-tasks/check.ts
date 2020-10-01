import { task } from "../internal/core/config/config-env";

import { TASKS } from "./task-names";

export default function () {
  task(TASKS.CHECK.MAIN, "Check whatever you need", async () => {});
}
