# Verbose logging

You can enable Hardhat's verbose mode by running it with its `--verbose` flag, or by setting the `HARDHAT_VERBOSE` environment variable to `true`.

This mode will print a lot of output that can be super useful for debugging. An example of a Hardhat run in verbose mode is:

```
$ npx hardhat test --verbose
  hardhat:core:hre Creating HardhatRuntimeEnvironment +0ms
  hardhat:core:hre Running task test +93ms
  hardhat:core:hre Running task compile +1ms
  hardhat:core:hre Running task compile:get-compilation-tasks +0ms
  hardhat:core:hre Running task compile:solidity +0ms
  hardhat:core:hre Running task compile:solidity:get-source-paths +0ms
  hardhat:core:hre Running task compile:solidity:get-source-names +9ms
  hardhat:core:hre Running task compile:solidity:get-dependency-graph +4ms
  hardhat:core:hre Running task compile:solidity:get-compilation-jobs +10ms
  hardhat:core:tasks:compile The dependency graph was divided in '1' connected components +0ms
  hardhat:core:hre Running task compile:solidity:get-compilation-job-for-file +1ms
  hardhat:core:compilation-job File '/tmp/hardhat-project/contracts/Greeter.sol' will be compiled with version '0.7.3' +0ms
  hardhat:core:compilation-job File '/tmp/hardhat-project/node_modules/hardhat/console.sol' added as dependency of '/tmp/hardhat-project/contracts/Greeter.sol' +0ms
  hardhat:core:hre Running task compile:solidity:get-compilation-job-for-file +13ms
  hardhat:core:compilation-job File '/tmp/hardhat-project/node_modules/hardhat/console.sol' will be compiled with version '0.7.3' +1ms
  hardhat:core:hre Running task compile:solidity:handle-compilation-jobs-failures +1ms
  hardhat:core:hre Running task compile:solidity:filter-compilation-jobs +0ms
  hardhat:core:tasks:compile '1' jobs were filtered out +15ms
  hardhat:core:hre Running task compile:solidity:merge-compilation-jobs +1ms
  hardhat:core:hre Running task compile:solidity:compile-jobs +1ms
  hardhat:core:tasks:compile No compilation jobs to compile +1ms
  hardhat:core:hre Running task compile:solidity:log:nothing-to-compile +0ms
  hardhat:core:hre Running task compile:solidity:log:compilation-result +6ms
  hardhat:core:hre Running task test:get-test-files +1ms
  hardhat:core:hre Running task test:setup-test-environment +0ms
  hardhat:core:hre Running task test:show-fork-recommendations +0ms
  hardhat:core:hre Running task test:run-mocha-tests +0ms


  Greeter
  hardhat:core:hre Creating provider for network hardhat +78ms
Deploying a Greeter with greeting: Hello, world!
Changing greeting from 'Hello, world!' to 'Hola, mundo!'
    ✓ Should return the new greeting once it's changed (769ms)


  1 passing (771ms)

  hardhat:core:cli Killing Hardhat after successfully running task test +0ms
```

Hardhat uses the [debug](https://github.com/visionmedia/debug) package to manage logging. The `DEBUG` environment variable can be used to turn on the verbose logging and filter it using a simple wildcard pattern.
