import { TASK_TEST } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { task } from "@nomiclabs/buidler/config";
import { ensurePluginLoadedWithUsePlugin } from "@nomiclabs/buidler/plugins";

ensurePluginLoadedWithUsePlugin();

export default function() {
  task(TASK_TEST, (args, env, runSuper) => {
    console.log(">> Test Task in buidler-ganache\n");

    // Get Ganache config
    const ganachePort = 8545;

    console.log(">> Start Ganache\n");
    const ganache = require("ganache-cli");
    const server = ganache.server();
    server.listen(ganachePort, function(err: any, blockchain: any) {
      if (err) {
        console.log(">> Ganache Error:\n");
        console.log(err);
      }

      // Only for debug
      // console.log(blockchain);
    });

    // Run original TEST TASK
    const ret = runSuper(); // TODO This is running async and should run sync

    console.log(">> TODO - Stop Ganache\n");
    // server.close();

    return ret;
  });
}
