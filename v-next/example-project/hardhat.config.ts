import { defineConfig } from "hardhat/config";

import util from "node:util";
import HardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import HardhatViem from "@nomicfoundation/hardhat-viem";
import HardhatViemAssertions from "@nomicfoundation/hardhat-viem-assertions";

util.inspect.defaultOptions.depth = null;

export default defineConfig({
  plugins: [HardhatNodeTestRunner, HardhatViem, HardhatViemAssertions],
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
          {
            version: "0.8.33",
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
  },
});
