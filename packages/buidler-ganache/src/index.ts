import { TASK_TEST } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task } from "@nomiclabs/buidler/config";
import { ensurePluginLoadedWithUsePlugin } from "@nomiclabs/buidler/plugins";

ensurePluginLoadedWithUsePlugin();

export default function() {
  task(TASK_TEST, (_, __, runSuper) => {
    console.log("ACA");
    return runSuper();
  });
}
