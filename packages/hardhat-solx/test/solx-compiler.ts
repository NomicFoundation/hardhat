import type { CompilerInput, CompilerOutput } from "hardhat/types/solidity";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { SolxCompiler } from "../src/internal/solx-compiler.js";

// Track calls to the fake spawnCompile
let spawnCompileCalls: Array<{
  command: string;
  args: string[];
  input: CompilerInput;
}> = [];
const fakeOutput: CompilerOutput = { sources: {}, contracts: {} };

async function fakeSpawnCompile(
  command: string,
  args: string[],
  input: CompilerInput,
): Promise<CompilerOutput> {
  spawnCompileCalls.push({ command, args, input });
  return fakeOutput;
}

describe("SolxCompiler", () => {
  beforeEach(() => {
    spawnCompileCalls = [];
  });

  it("implements the Compiler interface", async () => {
    const compiler = new SolxCompiler("0.1.3", "/path/to/solx");

    assert.equal(compiler.version, "0.1.3");
    assert.equal(compiler.longVersion, "0.1.3+solx");
    assert.equal(compiler.compilerPath, "/path/to/solx");
    assert.equal(compiler.isSolcJs, false);
  });

  it("calls spawnCompile with correct binary path and args", async () => {
    const compiler = new SolxCompiler(
      "0.1.3",
      "/path/to/solx",
      {},
      fakeSpawnCompile,
    );
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
    const compiler = new SolxCompiler(
      "0.1.3",
      "/path/to/solx",
      { LLVMOptimization: "1" },
      fakeSpawnCompile,
    );
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
    const compiler = new SolxCompiler(
      "0.1.3",
      "/path/to/solx",
      { LLVMOptimization: "1" },
      fakeSpawnCompile,
    );
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
    const compiler = new SolxCompiler(
      "0.1.3",
      "/path/to/solx",
      {},
      fakeSpawnCompile,
    );
    const input: CompilerInput = {
      language: "Solidity",
      sources: { "A.sol": { content: "pragma solidity ^0.8.0;" } },
      settings: { optimizer: {}, outputSelection: {} },
    };

    const result = await compiler.compile(input);
    assert.equal(result, fakeOutput);
  });
});
