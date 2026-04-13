import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { JsonRpcServer } from "hardhat/types/network";

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
} from "viem";

import hardhatViem from "@nomicfoundation/hardhat-viem";

describe("revert error cause chain", () => {
  useEphemeralFixtureProject("default-ts-project");

  describe("in-process hardhat network", () => {
    let hre: HardhatRuntimeEnvironment;
    let viem: HardhatViemHelpers;

    before(async () => {
      hre = await createHardhatRuntimeEnvironment({
        plugins: [hardhatViem],
      });

      await hre.tasks.getTask("build").run({});
    });

    beforeEach(async () => {
      ({ viem } = await hre.network.connect());
    });

    it("should have ContractFunctionExecutionError as the thrown error", async () => {
      const contract = await viem.deployContract("Revert");

      let caughtError: Error | undefined;
      try {
        await contract.read.alwaysRevert();
      } catch (error) {
        ensureError(error);
        caughtError = error;
      }

      assert.ok(
        caughtError !== undefined &&
          caughtError instanceof ContractFunctionExecutionError,
        `Expected ContractFunctionExecutionError, got ${caughtError?.name}`,
      );
      assert.ok(
        caughtError.message.includes("Intentional revert for testing purposes"),
        `Expected message to include "Intentional revert for testing purposes", got: "${caughtError.message}"`,
      );
    });

    it("should have SolidityError in cause chain", async () => {
      const contract = await viem.deployContract("Revert");

      let caughtError: Error | undefined;
      try {
        await contract.read.alwaysRevert();
      } catch (error) {
        ensureError(error);
        caughtError = error;
      }

      let current: Error | undefined = caughtError;
      let solidityError: Error | undefined;

      while (current !== undefined) {
        if (current.name === "SolidityError") {
          solidityError = current;
          break;
        }

        current = current.cause instanceof Error ? current.cause : undefined;
      }

      assert.ok(
        solidityError !== undefined,
        "Expected to find SolidityError in the cause chain",
      );
      assert.ok(
        "code" in solidityError && solidityError.code === 3,
        `Expected error code 3, got ${"code" in solidityError ? String(solidityError.code) : "undefined"}`,
      );
    });
  });

  describe("hardhat node (HTTP)", () => {
    let hre: HardhatRuntimeEnvironment;
    let viem: HardhatViemHelpers;
    let server: JsonRpcServer;
    let address: string;
    let port: number;

    before(async () => {
      hre = await createHardhatRuntimeEnvironment({
        plugins: [hardhatViem],
        networks: {
          localhost: { type: "http", url: "http://127.0.0.1:0" },
        },
      });

      await hre.tasks.getTask("build").run({});

      server = await hre.network.createServer();
      ({ address, port } = await server.listen());
    });

    after(async () => {
      await server.close();
    });

    beforeEach(async () => {
      ({ viem } = await hre.network.connect({
        network: "localhost",
        override: {
          url: `http://${address}:${port}`,
        },
      }));
    });

    it("should have ContractFunctionExecutionError as the thrown error", async () => {
      const contract = await viem.deployContract("Revert");

      let caughtError: Error | undefined;
      try {
        await contract.read.alwaysRevert();
      } catch (error) {
        ensureError(error);
        caughtError = error;
      }

      assert.ok(
        caughtError !== undefined &&
          caughtError instanceof ContractFunctionExecutionError,
        `Expected ContractFunctionExecutionError, got ${caughtError?.name}`,
      );
      assert.ok(
        caughtError.message.includes("Intentional revert for testing purposes"),
        `Expected message to include "Intentional revert for testing purposes", got: "${caughtError.message}"`,
      );

      let current: Error | undefined = caughtError;
      let errorWithCode3: Error | undefined;

      while (current !== undefined) {
        if ("code" in current && current.code === 3) {
          errorWithCode3 = current;
          break;
        }

        current = current.cause instanceof Error ? current.cause : undefined;
      }

      assert.ok(
        errorWithCode3 !== undefined,
        "Expected to find an error with code 3 in the cause chain",
      );

      const cause = caughtError.cause;
      ensureError(cause, ContractFunctionRevertedError);
      assert.ok(
        "raw" in cause && cause.raw !== undefined,
        "Expected raw revert data to be present on ContractFunctionRevertedError",
      );
    });
  });
});
