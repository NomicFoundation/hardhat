import { describe, it } from "node:test";

import {
  assertRejects,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import {
  createHardhatRuntimeEnvironment,
  importUserConfig,
  resolveHardhatConfigPath,
} from "hardhat/hre";

// `set(uint256)` with `v = 0`, which fails `Counter._checkPositive`.
const SET_ZERO_CALLDATA = `0x60fe47b1${"0".repeat(64)}`;

describe(
  "hardhat-slang stack traces",
  {
    // Needs a pinned release that emits debugSymbols and an EDR that builds
    // stack traces from them. Opt in once both do, so this turns on without a
    // code change.
    skip:
      process.env.HARDHAT_DISABLE_SLOW_TESTS === "true" ||
      process.env.HARDHAT_SLANG_EXPECT_STACK_TRACES !== "true",
  },
  () => {
    useFixtureProject("with-debug-info");

    it("reports Solidity frames for a revert in a slang-compiled contract", async () => {
      const configPath = await resolveHardhatConfigPath();
      const userConfig = await importUserConfig(configPath);
      const hre = await createHardhatRuntimeEnvironment(userConfig, {
        buildProfile: "slang",
      });

      await hre.tasks
        .getTask("build")
        .run({ force: true, quiet: true, noTests: true });

      const { bytecode } = await hre.artifacts.readArtifact("Counter");
      const connection = await hre.network.connect();
      try {
        const { provider } = connection;
        const [from] = await provider.request({ method: "eth_accounts" });
        const deployHash = await provider.request({
          method: "eth_sendTransaction",
          params: [{ from, data: bytecode }],
        });
        const receipt = await provider.request({
          method: "eth_getTransactionReceipt",
          params: [deployHash],
        });

        await assertRejects(
          provider.request({
            method: "eth_sendTransaction",
            params: [
              { from, to: receipt.contractAddress, data: SET_ZERO_CALLDATA },
            ],
          }),
          (error) =>
            error.stack?.includes(
              "at Counter._checkPositive (contracts/Counter.sol:13)",
            ) === true &&
            error.stack.includes("at Counter.set (contracts/Counter.sol:8)"),
          "expected Solidity frames for Counter._checkPositive and Counter.set in the error stack",
        );
      } finally {
        await connection.close();
      }
    });
  },
);
