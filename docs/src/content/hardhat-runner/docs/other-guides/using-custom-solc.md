# Using a custom Solidity compiler

To use a custom, local version of the Solidity compiler, you need to override the `TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD` subtask in your Hardhat config.

This subtask returns an object with four properties:

- `compilerPath`: the path to the compiler
- `isSolcJs`: a flag indicating if the compiler is a javascript module or a native binary
- `version`: the short version of the compiler (for example, `0.8.24`)
- `longVersion`: the long version of the compiler (for example, `0.8.24+commit.e11b9ed9`). This property is used as extra metadata in the build-info files, so you shouldn't worry too much about its value.

Here is an example to override the [wasm solc build for version `0.8.24`](https://binaries.soliditylang.org/wasm/soljson-v0.8.24+commit.e11b9ed9.js):

```js
// hardhat.config.js
const {
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
} = require("hardhat/builtin-tasks/task-names");
const path = require("path");

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (args.solcVersion === "0.8.24") {
    const compilerPath = path.join(
      __dirname,
      "soljson-v0.8.24+commit.e11b9ed9.js"
    );

    return {
      compilerPath,
      isSolcJs: true, // if you are using a native compiler, set this to false
      version: args.solcVersion,
      // This is used as extra information in the build-info files,
      // but other than that is not important
      longVersion: "0.8.24+commit.e11b9ed9",
    };
  }

  // since we only want to override the compiler for version 0.8.24,
  // the runSuper function allows us to call the default subtask.
  return runSuper();
});

module.exports = {
  solidity: "0.8.24",
};
```

Check our ["Creating a task" guide](/hardhat-runner/docs/advanced/create-task) to learn more about overriding tasks.
