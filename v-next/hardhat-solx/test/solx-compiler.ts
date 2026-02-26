import type { SolxCompiler as SolxCompilerType } from "../src/internal/solx-compiler.js";
import type { SolidityCompilerConfig, SolxConfig } from "hardhat/types/config";
import type { SolidityHooks } from "hardhat/types/hooks";
import type { CompilerInput, CompilerOutput } from "hardhat/types/solidity";

import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

// Track calls to spawnCompile
let spawnCompileCalls: Array<{
  command: string;
  args: string[];
  input: CompilerInput;
}> = [];
const fakeOutput: CompilerOutput = { sources: {}, contracts: {} };

// Mock spawnCompile before any dynamic imports of modules that use it
mock.module("hardhat/internal/solidity", {
  namedExports: {
    spawnCompile: async (
      command: string,
      args: string[],
      input: CompilerInput,
    ) => {
      spawnCompileCalls.push({ command, args, input });
      return fakeOutput;
    },
  },
});

describe("SolxCompiler", () => {
  let SolxCompiler: typeof SolxCompilerType;

  before(async () => {
    const mod = await import("../src/internal/solx-compiler.js");
    SolxCompiler = mod.SolxCompiler;
  });

  beforeEach(() => {
    spawnCompileCalls = [];
  });

  it("calls spawnCompile with correct binary path and args", async () => {
    const compiler = new SolxCompiler("/path/to/solx");
    const input: CompilerInput = {
      language: "Solidity",
      sources: { "A.sol": { content: "pragma solidity ^0.8.0;" } },
      settings: { optimizer: { enabled: true }, outputSelection: {} },
    };

    await compiler.compile(input);

    assert.equal(spawnCompileCalls.length, 1);
    const call = spawnCompileCalls[0];
    assert.equal(call.command, "/path/to/solx");
    assert.deepEqual(call.args, ["--standard-json", "--no-import-callback"]);
  });

  it("merges extraSettings into input.settings", async () => {
    const compiler = new SolxCompiler("/path/to/solx", {
      LLVMOptimization: "1",
    });
    const input: CompilerInput = {
      language: "Solidity",
      sources: { "A.sol": { content: "pragma solidity ^0.8.0;" } },
      settings: {
        optimizer: { enabled: true },
        outputSelection: { "*": { "*": ["abi"] } },
      },
    };

    await compiler.compile(input);

    assert.equal(spawnCompileCalls.length, 1);
    assert.deepEqual(spawnCompileCalls[0].input.settings, {
      optimizer: { enabled: true },
      outputSelection: { "*": { "*": ["abi"] } },
      LLVMOptimization: "1",
    });
  });

  it("does not modify the original input object", async () => {
    const compiler = new SolxCompiler("/path/to/solx", {
      LLVMOptimization: "1",
    });
    const input: CompilerInput = {
      language: "Solidity",
      sources: { "A.sol": { content: "pragma solidity ^0.8.0;" } },
      settings: { optimizer: { enabled: true }, outputSelection: {} },
    };

    const originalSettings = { ...input.settings };
    await compiler.compile(input);

    assert.deepEqual(
      input.settings,
      originalSettings,
      "Original input settings should not be modified",
    );
  });

  it("returns the output from spawnCompile", async () => {
    const compiler = new SolxCompiler("/path/to/solx");
    const input: CompilerInput = {
      language: "Solidity",
      sources: { "A.sol": { content: "pragma solidity ^0.8.0;" } },
      settings: { optimizer: {}, outputSelection: {} },
    };

    const result = await compiler.compile(input);
    assert.equal(result, fakeOutput);
  });
});

describe("invokeSolc hook — solx compilation path", () => {
  let hookHandlerModule: {
    default: () => Promise<Partial<SolidityHooks>>;
  };

  before(async () => {
    hookHandlerModule = await import(
      "../src/internal/hook-handlers/solidity.js"
    );
  });

  beforeEach(() => {
    spawnCompileCalls = [];
  });

  const mockCompiler = {
    version: "0.8.28",
    longVersion: "0.8.28+commit.abc123",
    compilerPath: "/path/to/solx-binary",
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

  function createMockContext(solxConfig: SolxConfig): any {
    return { config: { solx: solxConfig } };
  }

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
    return { next, wasCalled: () => called };
  }

  it("does not call next when type is 'solx' with non-empty settings", async () => {
    const hooks = await hookHandlerModule.default();

    const context = createMockContext({
      version: "0.1.3",
      settings: { LLVMOptimization: "1" },
    });

    const compilerConfig: SolidityCompilerConfig = {
      type: "solx",
      version: "0.8.28",
      settings: { optimizer: {}, outputSelection: {} },
      // _buildScope was removed during PR 1 review; will be cleaned up at rebase
    };

    const mockNext = createMockNext();

    assert.ok(
      hooks.invokeSolc !== undefined,
      "invokeSolc hook should be defined",
    );
    await hooks.invokeSolc(
      context,
      mockCompiler,
      mockInput,
      compilerConfig,
      mockNext.next,
    );

    assert.ok(
      !mockNext.wasCalled(),
      "next should NOT have been called for solx with settings",
    );
  });

  it("invokes spawnCompile with merged settings through SolxCompiler", async () => {
    const hooks = await hookHandlerModule.default();

    const context = createMockContext({
      version: "0.1.3",
      settings: { LLVMOptimization: "1" },
    });

    const compilerConfig: SolidityCompilerConfig = {
      type: "solx",
      version: "0.8.28",
      settings: { optimizer: {}, outputSelection: {} },
    };

    const mockNext = createMockNext();

    assert.ok(
      hooks.invokeSolc !== undefined,
      "invokeSolc hook should be defined",
    );
    const result = await hooks.invokeSolc(
      context,
      mockCompiler,
      mockInput,
      compilerConfig,
      mockNext.next,
    );

    // Verify spawnCompile was called with the compiler's binary path
    assert.equal(spawnCompileCalls.length, 1);
    assert.equal(spawnCompileCalls[0].command, "/path/to/solx-binary");
    assert.deepEqual(spawnCompileCalls[0].args, [
      "--standard-json",
      "--no-import-callback",
    ]);

    // Verify settings were merged (LLVMOptimization added to input settings)
    assert.deepEqual(spawnCompileCalls[0].input.settings, {
      optimizer: {},
      outputSelection: { "*": { "*": ["abi"] } },
      LLVMOptimization: "1",
    });

    // Verify it returned the output
    assert.equal(result, fakeOutput);
  });
});
