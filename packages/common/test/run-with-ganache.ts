import { ChildProcess } from "child_process";

import { cleanup, ganacheSetup } from "./helper/ganache-provider";

const ganacheCliArgs = (process.env.GANACHE_CLI_ARGS || "")
  .split(/[\s,]+/)
  .filter(arg => arg.length > 0);

let ganacheInstance: ChildProcess | null;

/**
 * Ensure ganache is running, for tests that require it.
 */
before(async () => {
  const ganacheArgsStr =
    Array.isArray(ganacheCliArgs) && ganacheCliArgs.length > 0
      ? `with args: '${JSON.stringify(ganacheCliArgs)}'`
      : "";

  console.log(`### Setting up ganache instance ${ganacheArgsStr}###\n`);
  ganacheInstance = await ganacheSetup(ganacheCliArgs);
  if (ganacheInstance) {
    console.log("### Started our own ganache instance ###");
  } else {
    console.log("### Using existing ganache instance ###");
  }
});

/**
 * Cleanup ganache instance down after test finishes.
 */
after(async () => {
  if (!ganacheInstance) {
    return;
  }
  cleanup(ganacheInstance);
  console.log("\n### Stopped ganache instance ###");
});
