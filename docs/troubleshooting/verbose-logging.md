# Verbose logging

You can enable Hardhat's verbose mode by running it with its `--verbose` flag, or by setting the `HARDHAT_VERBOSE` environment variable to `true`.

This mode will print a lot of output that can be super useful for debugging. An example of Hardhat run in verbose mode is:

// TODO-HH: re-run this

```
pato@pmbp:asd% npx hardhat --verbose
  hardhat:core:plugins Loading plugin file /Users/pato/projects/hardhat/hardhat/packages/hardhat/internal/core/tasks/builtin-tasks +0ms
  hardhat:core:plugins Loading plugin file /Users/pato/projects/hardhat/hardhat/packages/hardhat/builtin-tasks/clean +3ms
  hardhat:core:plugins Loading plugin file /Users/pato/projects/hardhat/hardhat/packages/hardhat/builtin-tasks/compile +2ms
  hardhat:core:plugins Loading plugin file /Users/pato/projects/hardhat/hardhat/packages/hardhat/builtin-tasks/console +53ms
  hardhat:core:plugins Loading plugin file /Users/pato/projects/hardhat/hardhat/packages/hardhat/builtin-tasks/flatten +3ms
  hardhat:core:plugins Loading plugin file /Users/pato/projects/hardhat/hardhat/packages/hardhat/builtin-tasks/help +1ms
  hardhat:core:plugins Loading plugin file /Users/pato/projects/hardhat/hardhat/packages/hardhat/builtin-tasks/run +2ms
  hardhat:core:plugins Loading plugin file /Users/pato/projects/hardhat/hardhat/packages/hardhat/builtin-tasks/test +1ms
  hardhat:core:plugins Loading plugin @nomiclabs/hardhat-truffle5 +2ms
  hardhat:core:plugins Hardhat is linked, searching for plugin starting from CWD /private/tmp/asd +0ms
  hardhat:core:plugins Loading plugin file /Users/pato/projects/hardhat/hardhat/packages/hardhat-truffle5/dist/index.js +5ms
  hardhat:core:plugins Loading plugin @nomiclabs/hardhat-web3 +60ms
  hardhat:core:plugins Hardhat is linked, searching for plugin starting from CWD /private/tmp/asd +0ms
  hardhat:core:plugins Loading plugin file /Users/pato/projects/hardhat/hardhat/packages/hardhat-web3/dist/index.js +0ms
  hardhat:core:analytics Computing Project Id for /private/tmp/asd +0ms
  hardhat:core:analytics Project Id set to acce19ef71fcff30788e87c9d69ca4d0a5aee84c8f8cf696183a21b788730078 +1ms
  hardhat:core:analytics Looking up Client Id at /Users/pato/.hardhat/config.json +1ms
  hardhat:core:analytics Client Id found: 61cf5dde-8c57-447b-bfe0-d57bdd80ab68 +1ms
  hardhat:core:hre Creating HardhatRuntimeEnvironment +0ms
  hardhat:core:hre Running task help +1ms
Hardhat version 1.0.0

Usage: hardhat [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

GLOBAL OPTIONS:

  --config              A Hardhat config file.
  --emoji               Use emoji in messages.
  --help                Shows this message, or a task's help if its name is provided
  --max-memory          The maximum amount of memory that Hardhat can use.
  --network             The network to connect to.
  --show-stack-traces   Show stack traces.
  --verbose             Enables Hardhat verbose logging
  --version             Shows hardhat's version.


AVAILABLE TASKS:

  clean         Clears the cache and deletes all artifacts
  compile       Compiles the entire project, building all artifacts
  console       Opens a hardhat console
  flatten       Flattens and prints all contracts and their dependencies
  help          Prints this message
  run           Runs a user-defined script after compiling the project
  sample-task   A sample Hardhat task
  test          Runs mocha tests

To get help for a specific task run: npx hardhat help [task]

  hardhat:core:cli Killing Hardhat after successfully running task help +0ms
```

Hardhat uses the [debug](https://github.com/visionmedia/debug) package to manage logging. The `DEBUG` environment variable that can be used to turn on the verbose logging and filter it using a simple wildcard pattern.
