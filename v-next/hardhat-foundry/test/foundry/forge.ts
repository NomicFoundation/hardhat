import assert from "node:assert/strict";
import { exec } from "node:child_process";
import * as path from "node:path";
import { describe, it } from "node:test";
import { promisify } from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  getForgeRemappings,
  hasFoundryConfig,
  isForgeInstalled,
  resetExecMock,
  setExecMock,
} from "../../src/internal/foundry/forge.js";
import { createMockExec, MOCK_SCENARIOS } from "../helpers/mock-exec.js";

describe("forge utilities", () => {
  describe("hasFoundryConfig", () => {
    it("should return true when foundry.toml exists", async () => {
      const fixtureDir = path.join(
        import.meta.dirname,
        "../mock-foundry-projects/with-foundry-toml",
      );
      const result = await hasFoundryConfig(fixtureDir);
      assert.equal(result, true);
    });

    it("should return false when foundry.toml does not exist", async () => {
      const fixtureDir = path.join(
        import.meta.dirname,
        "../mock-foundry-projects/without-foundry-toml",
      );
      const result = await hasFoundryConfig(fixtureDir);
      assert.equal(result, false);
    });
  });

  describe("isForgeInstalled", () => {
    it("should return true when forge is installed", async () => {
      try {
        setExecMock(createMockExec(MOCK_SCENARIOS.FORGE_VERSION_SUCCESS));
        assert.equal(await isForgeInstalled(), true);
      } finally {
        resetExecMock();
      }
    });

    it("should return false when forge is not installed", async () => {
      try {
        setExecMock(createMockExec(MOCK_SCENARIOS.FORGE_VERSION_NOT_INSTALLED));
        assert.equal(await isForgeInstalled(), false);
      } finally {
        resetExecMock();
      }
    });
  });

  describe("getForgeRemappings", () => {
    it("should parse forge remappings output correctly", async () => {
      try {
        setExecMock(createMockExec(MOCK_SCENARIOS.SUCCESS));
        const remappings = await getForgeRemappings("/fake/path");

        assert.deepEqual(remappings, [
          "@openzeppelin/=lib/openzeppelin-contracts/",
          "forge-std/=lib/forge-std/src/",
        ]);
      } finally {
        resetExecMock();
      }
    });

    it("should return empty array when forge returns no remappings", async () => {
      try {
        setExecMock(createMockExec(MOCK_SCENARIOS.EMPTY));
        const remappings = await getForgeRemappings("/fake/path");

        assert.deepEqual(remappings, []);
      } finally {
        resetExecMock();
      }
    });

    it("should handle Windows line endings", async () => {
      try {
        setExecMock(createMockExec(MOCK_SCENARIOS.WINDOWS_LINE_ENDINGS));
        const remappings = await getForgeRemappings("/fake/path");

        assert.deepEqual(remappings, [
          "@openzeppelin/=lib/openzeppelin-contracts/",
          "forge-std/=lib/forge-std/src/",
        ]);
      } finally {
        resetExecMock();
      }
    });

    it("should throw FORGE_REMAPPINGS_FAILED when forge config has errors", async () => {
      try {
        setExecMock(createMockExec(MOCK_SCENARIOS.CONFIG_ERROR));
        await assertRejectsWithHardhatError(
          getForgeRemappings("/fake/path"),
          HardhatError.ERRORS.HARDHAT_FOUNDRY.GENERAL.FORGE_REMAPPINGS_FAILED,
          {
            packagePath: "/fake/path",
            stderr: "Error: failed to parse foundry.toml",
          },
        );
      } finally {
        resetExecMock();
      }
    });
  });

  describe("mocks: validation of edge cases", () => {
    it("should verify that missing binary error matches mock behavior", async () => {
      const execAsync = promisify(exec);

      // This test validates that our mock for FORGE_NOT_INSTALLED matches real behavior
      // We use a binary that definitely doesn't exist to test the error code
      const nonExistentBinary = "this-binary-definitely-does-not-exist-12345";

      // Type guard for error with code property
      const hasCode = (e: unknown): e is { code: number | string } => {
        return typeof e === "object" && e !== null && "code" in e;
      };

      try {
        await execAsync(`${nonExistentBinary} --version`);
        assert.fail(
          "Expected exec of non-existent binary to throw, but it succeeded",
        );
      } catch (error) {
        // Verify the error has the properties we expect and mock
        assert(
          hasCode(error),
          "Error should have a 'code' property (exit code or error code)",
        );

        // The error code should be 127 (command not found) or 'ENOENT' (no such file)
        // On Windows, the error code is 1 when the command is not found
        // This is what we mock in our tests as FORGE_NOT_INSTALLED scenario
        const isCommandNotFound =
          error.code === 127 ||
          error.code === "ENOENT" ||
          (process.platform === "win32" && error.code === 1);

        assert(
          isCommandNotFound,
          `Expected error.code to be 127, 'ENOENT', or 1 (Windows), got: ${error.code}`,
        );

        // Log the actual error for documentation purposes
        console.log(
          `  Validated: Missing binary returns error code: ${error.code}`,
        );
      }
    });

    it("should verify that the mocked invalid foundry.toml fails like forge", async function () {
      const execAsync = promisify(exec);

      // First, check if forge is installed
      try {
        await execAsync("forge --version");
      } catch {
        // Forge is not installed, skip this test
        console.log("  Skipping: forge is not installed");
        return;
      }

      // Type guard for error with code property
      const hasCode = (e: unknown): e is { code: number | string } => {
        return typeof e === "object" && e !== null && "code" in e;
      };

      // Run forge remappings in a directory with invalid foundry.toml
      const invalidFoundryDir = path.join(
        import.meta.dirname,
        "../mock-foundry-projects/with-invalid-foundry-toml",
      );

      try {
        await execAsync("forge remappings", { cwd: invalidFoundryDir });
        assert.fail(
          "Expected forge remappings with invalid foundry.toml to throw, but it succeeded",
        );
      } catch (error) {
        // Verify the error has the properties we expect and mock
        assert(
          hasCode(error),
          "Error should have a 'code' property (exit code)",
        );

        // The error code should be 1 (general error)
        // This is what we mock in our tests as CONFIG_ERROR scenario
        assert.equal(
          error.code,
          1,
          `Expected error.code to be 1, got: ${error.code}`,
        );

        // Log the actual error for documentation purposes
        console.log(
          `  Validated: Invalid foundry.toml returns error code: ${error.code}`,
        );
      }
    });
  });
});
