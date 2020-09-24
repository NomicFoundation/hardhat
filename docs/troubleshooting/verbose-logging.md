# Verbose logging

You can enable Buidler's verbose mode by running it with its `--verbose` flag, or by setting the `BUIDLER_VERBOSE` environment variable to `true`.

This mode will print a lot of output that can be super useful for debugging. An example of Hardhat run in verbose mode is:

// TODO-HH: re-run this

```
pato@pmbp:asd% npx buidler --verbose
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/internal/core/tasks/builtin-tasks +0ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/clean +3ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/compile +2ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/console +53ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/flatten +3ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/help +1ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/run +2ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-core/builtin-tasks/test +1ms
  buidler:core:plugins Loading plugin @nomiclabs/buidler-truffle5 +2ms
  buidler:core:plugins Buidler is linked, searching for plugin starting from CWD /private/tmp/asd +0ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-truffle5/dist/index.js +5ms
  buidler:core:plugins Loading plugin @nomiclabs/buidler-web3 +60ms
  buidler:core:plugins Buidler is linked, searching for plugin starting from CWD /private/tmp/asd +0ms
  buidler:core:plugins Loading plugin file /Users/pato/projects/buidler/buidler/packages/buidler-web3/dist/index.js +0ms
  buidler:core:analytics Computing Project Id for /private/tmp/asd +0ms
  buidler:core:analytics Project Id set to acce19ef71fcff30788e87c9d69ca4d0a5aee84c8f8cf696183a21b788730078 +1ms
  buidler:core:analytics Looking up Client Id at /Users/pato/.buidler/config.json +1ms
  buidler:core:analytics Client Id found: 61cf5dde-8c57-447b-bfe0-d57bdd80ab68 +1ms
  buidler:core:hre Creating HardhatRuntimeEnvironment +0ms
  buidler:core:hre Running task help +1ms
Buidler version 1.0.0

Usage: buidler [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Buidler config file.
  --emoji               Use emoji in messages.
  --help                Shows this message, or a task's help if its name is provided
  --max-memory          The maximum amount of memory that Buidler can use.
  --network             The network to connect to.
  --show-stack-traces   Show stack traces.
  --verbose             Enables Buidler verbose logging
  --version             Shows buidler's version.


AVAILABLE TASKS:

  clean         Clears the cache and deletes all artifacts
  compile       Compiles the entire project, building all artifacts
  console       Opens a buidler console
  flatten       Flattens and prints all contracts and their dependencies
  help          Prints this message
  run           Runs a user-defined script after compiling the project
  sample-task   A sample Buidler task
  test          Runs mocha tests

To get help for a specific task run: npx buidler help [task]

  buidler:core:cli Killing Buidler after successfully running task help +0ms
```

Buidler uses the [debug](https://github.com/visionmedia/debug) package to manage logging. The `DEBUG` environment variable that can be used to turn on the verbose logging and filter it using a simple wildcard pattern.
