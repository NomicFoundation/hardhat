import type { SolidityCompilerConfig, SolxConfig } from "hardhat/types/config";
import type { CompilerInput, CompilerOutput } from "hardhat/types/solidity";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

// Helper to create a mock context with the given plugin config
function createMockContext(solxConfig: SolxConfig): any {
  return {
    config: {
      solx: solxConfig,
    },
  };
}

// Helper to create a compiler config
function createSolidityCompilerConfig(type?: string): SolidityCompilerConfig {
  return {
    type,
    version: "0.8.28",
    settings: {
      optimizer: {},
      outputSelection: {},
    },
  };
}

// A mock "next" function that records if it was called
function createMockNext() {
  let called = false;
  const mockOutput: CompilerOutput = { sources: {}, contracts: {} };

  const next = async (
    _context: any,
    _compiler: any,
    _input: CompilerInput,
    _compilerConfig: SolidityCompilerConfig,
  ): Promise<CompilerOutput> => {
    called = true;
    return mockOutput;
  };

  return {
    next,
    wasCalled: () => called,
    output: mockOutput,
  };
}

// A mock compiler
const mockCompiler = {
  version: "0.8.28",
  longVersion: "0.8.28+commit.abc123",
  compilerPath: "/path/to/solc",
  isSolcJs: false,
  compile: async (_input: CompilerInput): Promise<CompilerOutput> => ({
    sources: {},
    contracts: {},
  }),
};

const mockInput: CompilerInput = {
  language: "Solidity",
  sources: {
    "A.sol": { content: "pragma solidity ^0.8.0; contract A {}" },
  },
  settings: {
    optimizer: {},
    outputSelection: { "*": { "*": ["abi"] } },
  },
};

describe("hardhat-solx solidity hook handler", () => {
  describe("invokeSolc", () => {
    it("passes through to next when compiler type is not 'solx'", async () => {
      const hookHandlerModule = await import(
        "../../src/internal/hook-handlers/solidity.js"
      );
      const hooks = await hookHandlerModule.default();

      const context = createMockContext({
        version: "0.1.3",
        settings: { LLVMOptimization: "1" },
      });

      // Standard solc config (no type or type undefined)
      const compilerConfig = createSolidityCompilerConfig(undefined);
      const mock = createMockNext();

      assert.ok(
        hooks.invokeSolc !== undefined,
        "invokeSolc hook should be defined",
      );
      await hooks.invokeSolc(
        context,
        mockCompiler,
        mockInput,
        compilerConfig,
        mock.next,
      );

      assert.ok(mock.wasCalled(), "next should have been called");
    });

    it("passes through to next when compiler type is 'solc'", async () => {
      const hookHandlerModule = await import(
        "../../src/internal/hook-handlers/solidity.js"
      );
      const hooks = await hookHandlerModule.default();

      const context = createMockContext({
        version: "0.1.3",
        settings: { LLVMOptimization: "1" },
      });

      const compilerConfig = createSolidityCompilerConfig("solc");
      const mock = createMockNext();

      assert.ok(
        hooks.invokeSolc !== undefined,
        "invokeSolc hook should be defined",
      );
      await hooks.invokeSolc(
        context,
        mockCompiler,
        mockInput,
        compilerConfig,
        mock.next,
      );

      assert.ok(mock.wasCalled(), "next should have been called");
    });

    it("passes through to next when type is 'solx' but settings is empty", async () => {
      const hookHandlerModule = await import(
        "../../src/internal/hook-handlers/solidity.js"
      );
      const hooks = await hookHandlerModule.default();

      const context = createMockContext({
        version: "0.1.3",
        settings: {},
      });

      const compilerConfig = createSolidityCompilerConfig("solx");
      const mock = createMockNext();

      assert.ok(
        hooks.invokeSolc !== undefined,
        "invokeSolc hook should be defined",
      );
      await hooks.invokeSolc(
        context,
        mockCompiler,
        mockInput,
        compilerConfig,
        mock.next,
      );

      assert.ok(
        mock.wasCalled(),
        "next should have been called (no settings to inject)",
      );
    });
  });

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

      const context = createMockContext({
        version: "0.1.3",
        settings: {},
      });

      // All configs are solc (no type or type undefined)
      const configs: SolidityCompilerConfig[] = [
        createSolidityCompilerConfig(undefined),
        createSolidityCompilerConfig("solc"),
      ];

      // Should not throw and should not modify configs
      assert.ok(
        hooks.downloadCompilers !== undefined,
        "downloadCompilers hook should be defined",
      );
      await hooks.downloadCompilers(context, configs, true);

      // Paths should remain undefined (no download triggered)
      assert.equal(configs[0].path, undefined);
      assert.equal(configs[1].path, undefined);
    });
  });
});
