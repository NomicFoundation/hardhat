import type { HardhatUserConfig } from "@ignored/hardhat-vnext/types/config";

import { HardhatPluginError } from "@ignored/hardhat-vnext/plugins";

import {
  task,
  emptyTask,
  configVariable,
  globalOption,
} from "@ignored/hardhat-vnext/config";
import HardhatNodeTestRunner from "@ignored/hardhat-vnext-node-test-runner";
import HardhatMochaTestRunner from "@ignored/hardhat-vnext-mocha-test-runner";
import HardhatKeystore from "@ignored/hardhat-vnext-keystore";
import { viemScketchPlugin } from "./viem-scketch-plugin.js";

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
  .addVariadicArgument({
    name: "testFiles",
    description: "An optional list of files to test",
    defaultValue: [],
  })
  .addFlag({
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
    defaultValue: "",
  })
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

const printConfig = task("config", "Prints the config")
  .setAction(async ({}, hre) => {
    console.log(hre.config);
  })
  .build();

const printAccounts = task("accounts", "Prints the accounts")
  .setAction(async ({}, hre) => {
    const { provider } = await hre.network.connect();
    console.log(await provider.request({ method: "eth_accounts" }));
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
    testSolidityTask,
    exampleEmptyTask,
    exampleEmptySubtask,
    greeting,
    printConfig,
    printAccounts,
  ],
  plugins: [
    pluginExample,
    HardhatKeystore,
    HardhatMochaTestRunner,
    // if testing node plugin, use the following line instead
    // HardhatNodeTestRunner,
    viemScketchPlugin,
  ],
  paths: {
    tests: "test/mocha",
    // if testing node plugin, use the following line instead
    // tests: "test/node",
  },
};

export default config;
