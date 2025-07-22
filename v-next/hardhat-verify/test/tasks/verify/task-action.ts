import type { HardhatUserConfig } from "hardhat/config";
import type { VerificationProvidersConfig } from "hardhat/types/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import assert from "node:assert/strict";
import {
  after,
  afterEach,
  before,
  beforeEach,
  describe,
  it,
  mock,
} from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import chalk from "chalk";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import { internalVerifyAction } from "../../../src/internal/tasks/verify/task-action.js";

describe("verify/task-action", () => {
  describe("verifyAction", () => {
    useEphemeralFixtureProject("integration");

    let hre: HardhatRuntimeEnvironment;
    let consoleLogSpy: ReturnType<typeof mock.method>;
    let consoleWarnSpy: ReturnType<typeof mock.method>;
    let consoleErrorSpy: ReturnType<typeof mock.method>;
    before(async () => {
      const hardhatUserConfig: HardhatUserConfig = {
        plugins: [(await import("../../../src/index.js")).default],
        verify: {
          etherscan: {
            apiKey: "your-api-key",
          },
        },
      };
      hre = await createHardhatRuntimeEnvironment(hardhatUserConfig);
      consoleLogSpy = mock.method(console, "log", () => {});
      consoleWarnSpy = mock.method(console, "warn", () => {});
      consoleErrorSpy = mock.method(console, "error", () => {});
    });

    let exitCode: string | number | undefined;
    beforeEach(() => {
      exitCode = process.exitCode;
      consoleLogSpy.mock.resetCalls();
      consoleWarnSpy.mock.resetCalls();
      consoleErrorSpy.mock.resetCalls();
    });

    afterEach(() => {
      process.exitCode = exitCode;
    });

    after(() => {
      consoleLogSpy.mock.restore();
      consoleWarnSpy.mock.restore();
      consoleErrorSpy.mock.restore();
    });

    it("should set process.exitCode to 0 when verification is successful", async () => {
      const verifyContract = async () => Promise.resolve(true);

      await internalVerifyAction(
        {
          address: "0x1234567890123456789012345678901234567890",
          constructorArgs: [],
        },
        hre,
        verifyContract,
      );

      assert.equal(process.exitCode, 0);
    });

    it("should set process.exitCode to 1 when verification fails", async () => {
      const verifyContract = async () => {
        throw new Error("Verification failed");
      };

      await internalVerifyAction(
        {
          address: "0x1234567890123456789012345678901234567890",
          constructorArgs: [],
        },
        hre,
        verifyContract,
      );

      assert.equal(process.exitCode, 1);
    });

    it("should log messages for successful and failed verifications", async () => {
      const verifyContract = async ({
        provider,
      }: {
        provider?: keyof VerificationProvidersConfig;
      }) => {
        if (provider === "etherscan") {
          console.log("Verification successful for Etherscan");
          return Promise.resolve(true);
        }
        throw new Error(`Verification failed for provider: ${provider}`);
      };

      await internalVerifyAction(
        {
          address: "0x1234567890123456789012345678901234567890",
          constructorArgs: [],
        },
        hre,
        verifyContract,
      );

      assert.equal(process.exitCode, 1);
      assert.equal(consoleLogSpy.mock.callCount(), 3);
      assert.equal(
        consoleLogSpy.mock.calls[0].arguments[0],
        chalk.cyan.bold(`\n=== Etherscan ===`),
      );
      assert.equal(
        consoleLogSpy.mock.calls[1].arguments[0],
        "Verification successful for Etherscan",
      );
      assert.equal(
        consoleLogSpy.mock.calls[2].arguments[0],
        chalk.cyan.bold(`\n=== Blockscout ===`),
      );
      assert.equal(consoleErrorSpy.mock.callCount(), 1);
      assert.equal(
        consoleErrorSpy.mock.calls[0].arguments[0],
        chalk.red("Verification failed for provider: blockscout"),
      );
    });

    it("should warn when no verification providers are enabled", async () => {
      const hardhatUserConfig: HardhatUserConfig = {
        plugins: [(await import("../../../src/index.js")).default],
        verify: {
          etherscan: {
            enabled: false,
          },
          blockscout: {
            enabled: false,
          },
        },
      };
      const localHre = await createHardhatRuntimeEnvironment(hardhatUserConfig);

      await internalVerifyAction(
        {
          address: "0x1234567890123456789012345678901234567890",
          constructorArgs: [],
        },
        localHre,
        async () => Promise.resolve(true),
      );

      assert.equal(process.exitCode, 0);
      assert.equal(consoleWarnSpy.mock.callCount(), 1);
      assert.equal(
        consoleWarnSpy.mock.calls[0].arguments[0],
        chalk.yellow("\n⚠️  No verification providers are enabled."),
      );
    });
  });
});
