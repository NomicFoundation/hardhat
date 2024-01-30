# Using a Custom Solidity Compiler (solc)

To use a custom version of the Solidity compiler, more specifically a downloaded version, you need to override the `TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD` subtask in the `hardhat.confg.js` file.

This subtask returns an object with four properties:

- `compilerPath`: the path to the compiler
- `isSolcJs`: a flag indicating if the compiler is a javascript module or a native binary
- `version`: the short version of the compiler (for example, `0.8.5`)
- `longVersion`: the long version of the compiler (for example, `0.8.5-nightly.2021.5.12+commit.98e2b4e5`). This property is used as extra metadata in the build-info files, so you shouldn't worry too much about its value.

Here is an example to override the solc build for version `0.8.5`:

```js
// hardhat.config.js
const {
  TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD,
} = require("hardhat/builtin-tasks/task-names");
const path = require("path");

subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD, async (args, hre, runSuper) => {
  if (args.solcVersion === "0.8.5") {
    const compilerPath = path.join(
      __dirname,
      "soljson-v0.8.5-nightly.2021.5.12+commit.98e2b4e5.js"
    );

    return {
      compilerPath,
      isSolcJs: true, // if you are using a native compiler, set this to false
      version: args.solcVersion,
      // This is used as extra information in the build-info files,
      // but other than that is not important
      longVersion: "0.8.5-nightly.2021.5.12+commit.98e2b4e5",
    };
  }

  // since we only want to override the compiler for version 0.8.5,
  // the runSuper function allows us to call the default subtask.
  return runSuper();
});

module.exports = {
  solidity: "0.8.5",
};
```

## Learn more

To learn more about the

- `subtask` function, check the [Subtask](/hardhat-runner/docs/advanced/create-task#subtasks) section of the documentation.
- `runSuper` function, check the [Extending Tasks](/hardhat-runner/docs/advanced/create-task#the--runsuper--function) section of the documentation.
