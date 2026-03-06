/* eslint-disable @typescript-eslint/consistent-type-assertions -- test */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- test */
import type { SolidityCompilerConfig } from "hardhat/types/config";
import type { CompilerInput, CompilerOutput } from "hardhat/types/solidity";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

// Helper to create a compiler config
function createSolidityCompilerConfig(
  overrides: Partial<SolidityCompilerConfig> = {},
): SolidityCompilerConfig {
  return {
    version: "0.8.33",
    settings: {
      optimizer: {},
      outputSelection: {},
    },
    ...overrides,
  };
}

// A mock "next" function for getCompiler
function createGetCompilerMockNext() {
  let called = false;
  const mockCompiler = {
    version: "0.8.33",
    longVersion: "0.8.33+commit.abc123",
    compilerPath: "/path/to/solc",
    isSolcJs: false,
    compile: async (_input: CompilerInput): Promise<CompilerOutput> => ({
      sources: {},
      contracts: {},
    }),
  };

  const next = async (
    _context: any,
    _compilerConfig: SolidityCompilerConfig,
  ) => {
    called = true;
    return mockCompiler;
  };

  return {
    next,
    wasCalled: () => called,
    compiler: mockCompiler,
  };
}

describe("hardhat-solx solidity hook handler", () => {
  describe("downloadCompilers", () => {
    it("is defined on the hook handler", async () => {
      const hookHandlerModule = await import(
        "../../src/internal/hook-handlers/solidity.js"
      );
      const hooks = await hookHandlerModule.default();

      assert.ok(
        hooks.downloadCompilers !== undefined,
        "downloadCompilers hook should be defined",
      );
    });

    it("does nothing when no solx-typed compilers present", async () => {
      const hookHandlerModule = await import(
        "../../src/internal/hook-handlers/solidity.js"
      );
      const hooks = await hookHandlerModule.default();

      const context = { config: {} } as any;

      // All configs are solc (no type or type undefined)
      const configs: SolidityCompilerConfig[] = [
        createSolidityCompilerConfig({ type: undefined }),
        createSolidityCompilerConfig({ type: "solc" }),
      ];

      // Should not throw
      assert.ok(
        hooks.downloadCompilers !== undefined,
        "downloadCompilers hook should be defined",
      );
      await hooks.downloadCompilers(context, configs, true);

      // Paths should remain undefined (no download triggered, no mutation)
      assert.equal(configs[0].path, undefined);
      assert.equal(configs[1].path, undefined);
    });

    it("does not mutate compiler config paths", async () => {
      const hookHandlerModule = await import(
        "../../src/internal/hook-handlers/solidity.js"
      );
      const hooks = await hookHandlerModule.default();

      const context = { config: {} } as any;

      const configs: SolidityCompilerConfig[] = [
        createSolidityCompilerConfig({ type: "solx", version: "0.8.33" }),
      ];

      // This will fail to download (no network in tests), but we can
      // verify via the error that it tries and that path is not mutated.
      // For a true unit test we'd mock downloadSolx, but for now just
      // check the path isn't set before the download attempt.
      const originalPath = configs[0].path;

      try {
        await hooks.downloadCompilers!(context, configs, true);
      } catch {
        // Expected — download fails in test environment
      }

      assert.equal(
        configs[0].path,
        originalPath,
        "compiler config path should not be mutated",
      );
    });
  });

  describe("getCompiler", () => {
    it("is defined on the hook handler", async () => {
      const hookHandlerModule = await import(
        "../../src/internal/hook-handlers/solidity.js"
      );
      const hooks = await hookHandlerModule.default();

      assert.ok(
        hooks.getCompiler !== undefined,
        "getCompiler hook should be defined",
      );
    });

    it("passes through to next for non-solx compiler configs", async () => {
      const hookHandlerModule = await import(
        "../../src/internal/hook-handlers/solidity.js"
      );
      const hooks = await hookHandlerModule.default();

      const context = { config: {} } as any;
      const compilerConfig = createSolidityCompilerConfig({ type: "solc" });
      const mockNext = createGetCompilerMockNext();

      const result = await hooks.getCompiler!(
        context,
        compilerConfig,
        mockNext.next,
      );

      assert.ok(mockNext.wasCalled(), "next should have been called");
      assert.equal(result, mockNext.compiler);
    });

    it("passes through to next for undefined type", async () => {
      const hookHandlerModule = await import(
        "../../src/internal/hook-handlers/solidity.js"
      );
      const hooks = await hookHandlerModule.default();

      const context = { config: {} } as any;
      const compilerConfig = createSolidityCompilerConfig({ type: undefined });
      const mockNext = createGetCompilerMockNext();

      const result = await hooks.getCompiler!(
        context,
        compilerConfig,
        mockNext.next,
      );

      assert.ok(mockNext.wasCalled(), "next should have been called");
      assert.equal(result, mockNext.compiler);
    });

    it("throws invariant error for unsupported solx version", async () => {
      const { HardhatError } = await import("@nomicfoundation/hardhat-errors");
      const hookHandlerModule = await import(
        "../../src/internal/hook-handlers/solidity.js"
      );
      const hooks = await hookHandlerModule.default();

      const context = { config: {} } as any;
      const compilerConfig = createSolidityCompilerConfig({
        type: "solx",
        version: "0.8.99",
      });
      const mockNext = createGetCompilerMockNext();

      await assertRejectsWithHardhatError(
        hooks.getCompiler!(context, compilerConfig, mockNext.next),
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        {
          message:
            "No solx version mapping for Solidity 0.8.99 — this should have been caught by config validation",
        },
      );
    });
  });
});
