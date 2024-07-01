import { HardhatPluginError } from "@ignored/hardhat-vnext/plugins";

import {
  task,
  HardhatUserConfig,
  emptyTask,
  overrideTask,
  configVariable,
  globalOption,
} from "@ignored/hardhat-vnext/config";

const exampleEmptyTask = emptyTask("empty", "An example empty task").build();

const exampleEmptySubtask = task(["empty", "task"])
  .setDescription("An example empty subtask task")
  .setAction(async (_, _hre) => {
    console.log("empty task");
  })
  .build();

const exampleTaskOverride = task("example2")
  .setAction(async (_, _hre) => {
    console.log("from an override");
  })
  .setDescription("An example task")
  .addVariadicParameter({
    name: "testFiles",
    description: "An optional list of files to test",
    // defaultValue: [],
  })
  .addOption({
    name: "noCompile",
    description: "Don't compile before running this task",
  })
  .addFlag({
    name: "parallel",
    description: "Run tests in parallel",
  })
  .addFlag({
    name: "bail",
    description: "Stop running tests after the first test failure",
  })
  .addOption({
    name: "grep",
    description: "Only run tests matching the given string or regexp",
  })
  .build();

const testTask = task("test", "Runs mocha tests")
  .addVariadicParameter({
    name: "testFiles",
    description: "An optional list of files to test",
    // defaultValue: [],
  })
  .addOption({
    name: "noCompile",
    description: "Don't compile before running this task",
  })
  .addFlag({
    name: "parallel",
    description: "Run tests in parallel",
  })
  .addFlag({
    name: "bail",
    description: "Stop running tests after the first test failure",
  })
  .addOption({
    name: "grep",
    description: "Only run tests matching the given string or regexp",
  })
  .setAction(import.meta.resolve("./tasks/non-existing.ts"))
  .build();

const testTaskOverride = overrideTask("test")
  .addFlag({
    name: "newFlag",
    description: "A new flag",
  })
  .setAction((_taskArguments, _hre, _runSuper) => {})
  .build();

const testSolidityTask = task(["test", "solidity"], "Runs Solidity tests")
  .setAction(async () => {
    console.log("Running Solidity tests");
  })
  .build();

const greeting = task("hello", "Prints a greeting")
  .addOption({
    name: "greeting",
    description: "The greeting to print",
    defaultValue: "Hello, World!",
  })
  .setAction(async ({ greeting }, _) => {
    console.log(greeting);
  })
  .build();

const pluginExample = {
  id: "community-plugin",
  tasks: [
    task("plugin-hello", "Prints a greeting from community-plugin")
      .addOption({
        name: "greeting",
        description: "The greeting to print",
        defaultValue: "Hello, World from community-plugin!",
      })
      .setAction(async ({ greeting }, _) => {
        console.log(greeting);

        if (greeting === "") {
          throw new HardhatPluginError(
            "community-plugin",
            "Greeting cannot be empty",
          );
        }
      })
      .build(),
  ],
  globalOptions: [
    globalOption({
      name: "myGlobalOption",
      description: "A global option",
      defaultValue: "default",
    }),
  ],
};

const config: HardhatUserConfig = {
  tasks: [
    exampleTaskOverride,
    testTask,
    testTaskOverride,
    testSolidityTask,
    exampleEmptyTask,
    exampleEmptySubtask,
    greeting,
  ],
  plugins: [pluginExample],
  privateKey: configVariable("privateKey"),
};

export default config;
