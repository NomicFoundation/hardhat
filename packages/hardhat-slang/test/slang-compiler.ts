import type { CompilerInput, CompilerOutput } from "hardhat/types/solidity";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  SLANG_DEBUG_INFO_SELECTORS,
  SlangCompiler,
  addSlangDebugInfoSelectors,
} from "../src/internal/slang-compiler.js";

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

describe("SlangCompiler", () => {
  beforeEach(() => {
    spawnCompileCalls = [];
  });

  it("implements the Compiler interface", async () => {
    const compiler = new SlangCompiler("0.1.4", "/path/to/slang");

    assert.equal(compiler.version, "0.1.4");
    assert.equal(compiler.longVersion, "0.1.4+slang");
    assert.equal(compiler.compilerPath, "/path/to/slang");
    assert.equal(compiler.isSolcJs, false);
  });

  it("forwards binary path, args, and the input unchanged to spawnCompile", async () => {
    const compiler = new SlangCompiler(
      "0.1.4",
      "/path/to/slang",
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
    assert.equal(call.command, "/path/to/slang");
    assert.deepEqual(call.args, ["--standard-json", "--no-import-callback"]);
    // compile() transforms nothing — slang's defaults (optimizer mode, viaIR,
    // debugInfo) are applied at config resolution, so the input reaches slang
    // exactly as the build system constructed it.
    assert.equal(call.input, input);
  });

  it("returns the output from spawnCompile", async () => {
    const compiler = new SlangCompiler(
      "0.1.4",
      "/path/to/slang",
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

describe("addSlangDebugInfoSelectors", () => {
  it("populates the wildcard slot when the input is empty", async () => {
    const result = await addSlangDebugInfoSelectors({});
    assert.deepEqual(result, {
      "*": { "*": [...SLANG_DEBUG_INFO_SELECTORS] },
    });
  });

  it("appends to an existing wildcard selector list without removing user entries", async () => {
    const result = await addSlangDebugInfoSelectors({
      "*": { "*": ["abi", "metadata"] },
    });
    assert.deepEqual(result, {
      "*": { "*": ["abi", "metadata", ...SLANG_DEBUG_INFO_SELECTORS] },
    });
  });

  it('preserves the file-level `[*][""]` slot for outputs like ast', async () => {
    const result = await addSlangDebugInfoSelectors({
      "*": { "": ["ast"] },
    });
    // The file-level slot must round-trip unchanged. Selectors are added at
    // the per-contract slot `["*"]["*"]` instead.
    assert.ok(result !== undefined, "result should not be undefined");
    assert.deepEqual(result["*"][""], ["ast"]);
  });

  it("does not mutate the input object", async () => {
    const input = { "*": { "*": ["abi"] } };
    const before = JSON.stringify(input);
    await addSlangDebugInfoSelectors(input);
    assert.equal(JSON.stringify(input), before);
  });

  it("accepts undefined input (sets up the wildcard slot)", async () => {
    const result = await addSlangDebugInfoSelectors(undefined);
    assert.deepEqual(result, {
      "*": { "*": [...SLANG_DEBUG_INFO_SELECTORS] },
    });
  });
});
