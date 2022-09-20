const { cleanup, ganacheSetup } = require("./ganache-provider");

const { GANACHE_CLI_ARGS } = process.env;

const ganacheCliArgs = (
  GANACHE_CLI_ARGS !== undefined ? GANACHE_CLI_ARGS : "-d"
)
  .split(/[\s,]+/)
  .filter((arg) => arg.length > 0);

let ganacheInstance;

/**
 * Ensure ganache is running, for tests that require it.
 */
before(async () => {
  const ganacheArgsStr =
    Array.isArray(ganacheCliArgs) && ganacheCliArgs.length > 0
      ? `with args: '${JSON.stringify(ganacheCliArgs)}'`
      : "";

  let setupMs = Date.now();
  try {
    ganacheInstance = await ganacheSetup(ganacheCliArgs);
    setupMs = Date.now() - setupMs;
  } catch (error) {
    console.log(
      `Could not setup a ganache instance: ${error.message || error}`
    );
  }

  if (ganacheInstance !== null) {
    console.log(
      `### Started our own ganache instance ${ganacheArgsStr} in ${setupMs}ms ###`
    );
  } else {
    console.log("### Using existing ganache instance ###");
  }
});

/**
 * Cleanup ganache instance down after test finishes.
 */
after(async () => {
  if (ganacheInstance === null) {
    return;
  }
  await cleanup(ganacheInstance);
  console.log("\n### Stopped ganache instance ###");
});
