import { TASK_TEST } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task } from "@nomiclabs/buidler/config";

task(TASK_TEST, async (_, env, runSuper) => {
  // Init ganache if necessary

  const ret = await runSuper();

  // Stop ganache if necessary

  return ret;
});
