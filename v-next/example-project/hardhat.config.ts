import type { HardhatUserConfig } from "hardhat/config";

import { HardhatPluginError } from "hardhat/plugins";

import util from "node:util";
import { task, emptyTask, globalOption, configVariable } from "hardhat/config";
import HardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import HardhatMochaTestRunner from "@nomicfoundation/hardhat-mocha";
import HardhatKeystore from "@nomicfoundation/hardhat-keystore";
import HardhatViem from "@nomicfoundation/hardhat-viem";
import HardhatViemAssertions from "@nomicfoundation/hardhat-viem-assertions";
import hardhatNetworkHelpersPlugin from "@nomicfoundation/hardhat-network-helpers";
import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import hardhatChaiMatchersPlugin from "@nomicfoundation/hardhat-ethers-chai-matchers";
import hardhatTypechain from "@nomicfoundation/hardhat-typechain";
import hardhatIgnitionViem from "@nomicfoundation/hardhat-ignition-viem";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import hardhatLedger from "@nomicfoundation/hardhat-ledger";
import { ArgumentType } from "hardhat/types/arguments";

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
    type: ArgumentType.STRING_WITHOUT_DEFAULT,
    defaultValue: undefined,
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
      ledgerAccounts: [
        // Set your ledger address here
        "0x070Da0697e6B82F0ab3f5D0FD9210EAdF2Ba1516",
      ],
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
    hardhatVerify,
    HardhatViem,
    HardhatViemAssertions,
    hardhatChaiMatchersPlugin,
    hardhatTypechain,
    hardhatIgnitionViem,
    hardhatLedger,
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
          {
            // Required for @uniswap/core
            version: "0.8.26",
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
    npmFilesToBuild: [
      "@openzeppelin/contracts/token/ERC20/ERC20.sol",
      "forge-std/Test.sol",
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
