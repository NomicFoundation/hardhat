import type { HardhatUserConfig } from "@ignored/hardhat-vnext/config";

import { HardhatPluginError } from "@ignored/hardhat-vnext/plugins";

import util from "node:util";
import {
  task,
  emptyTask,
  globalOption,
  configVariable,
} from "@ignored/hardhat-vnext/config";
import HardhatNodeTestRunner from "@ignored/hardhat-vnext-node-test-runner";
import HardhatMochaTestRunner from "@ignored/hardhat-vnext-mocha-test-runner";
import HardhatKeystore from "@ignored/hardhat-vnext-keystore";
import HardhatViem from "@ignored/hardhat-vnext-viem";
import hardhatNetworkHelpersPlugin from "@ignored/hardhat-vnext-network-helpers";
import hardhatEthersPlugin from "@ignored/hardhat-vnext-ethers";
import hardhatEthersChaiMatchersPlugin from "@ignored/hardhat-vnext-ethers-chai-matchers";
import hardhatTypechain from "@ignored/hardhat-vnext-typechain";
import hardhatIgnitionViem from "@ignored/hardhat-vnext-ignition-viem";

util.inspect.defaultOptions.depth = null;

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
    console.log(util.inspect(hre.config, { colors: true, depth: null }));
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
  networks: {
    op: {
      type: "http",
      chainType: "optimism",
      url: "https://mainnet.optimism.io/",
      accounts: [configVariable("OP_SENDER")],
    },
    edrOp: {
      type: "edr",
      chainType: "optimism",
      chainId: 10,
      forking: {
        url: "https://mainnet.optimism.io",
      },
    },
    opSepolia: {
      type: "http",
      chainType: "optimism",
      url: "https://sepolia.optimism.io",
      accounts: [configVariable("OP_SEPOLIA_SENDER")],
    },
    edrOpSepolia: {
      type: "edr",
      chainType: "optimism",
      forking: {
        url: "https://sepolia.optimism.io",
      },
    },
  },
  tasks: [
    exampleTaskOverride,
    exampleEmptyTask,
    exampleEmptySubtask,
    greeting,
    printConfig,
    printAccounts,
  ],
  plugins: [
    pluginExample,
    hardhatEthersPlugin,
    HardhatKeystore,
    HardhatMochaTestRunner,
    hardhatNetworkHelpersPlugin,
    HardhatNodeTestRunner,
    HardhatViem,
    hardhatEthersChaiMatchersPlugin,
    hardhatTypechain,
    hardhatIgnitionViem,
  ],
  paths: {
    tests: {
      mocha: "test/mocha",
      nodeTest: "test/node",
      solidity: "test/contracts",
    },
  },
  solidity: {
    profiles: {
      default: {
        compilers: [
          {
            version: "0.8.22",
          },
          {
            version: "0.7.1",
          },
        ],
        overrides: {
          "foo/bar.sol": {
            version: "0.8.1",
          },
        },
      },
      test: {
        version: "0.8.2",
      },
      coverage: {
        version: "0.8.2",
      },
    },
    dependenciesToCompile: [
      "@openzeppelin/contracts/token/ERC20/ERC20.sol",
      "forge-std/src/Test.sol",
    ],
    remappings: [
      "remapped/=npm/@openzeppelin/contracts@5.1.0/access/",
      // This is necessary because most people import forge-std/Test.sol, and not forge-std/src/Test.sol
      "forge-std/=npm/forge-std@1.9.4/src/",
    ],
  },
  solidityTest: {
    testFail: true,
  },
  typechain: {
    tsNocheck: false,
  },
};

export default config;
