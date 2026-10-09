import type { CompilerInput, CompilerOutput } from "hardhat/types/solidity";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { SLANG_RELEASES } from "../src/internal/constants.js";
import {
  SLANG_DEBUG_INFO_SELECTORS,
  SLANG_DEBUG_SYMBOLS_SELECTORS,
  SlangCompiler,
  addSlangStackTraceSelectors,
} from "../src/internal/slang-compiler.js";

const PINNED_VERSION = "0.1.0-pre.2026-10-01";
const PINNED_RELEASE = SLANG_RELEASES[PINNED_VERSION];

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

const sampleInput: CompilerInput = {
  language: "Solidity",
  sources: { "A.sol": { content: "pragma solidity ^0.8.0;" } },
  settings: { optimizer: { enabled: true }, outputSelection: {} },
};

describe("SlangCompiler", () => {
  beforeEach(() => {
    spawnCompileCalls = [];
  });

  it("implements the Compiler interface", async () => {
    const compiler = new SlangCompiler(PINNED_VERSION, "/path/to/slang", {
      release: PINNED_RELEASE,
    });

    assert.equal(compiler.version, PINNED_VERSION);
    assert.equal(compiler.longVersion, `${PINNED_VERSION}+slang`);
    assert.equal(compiler.compilerPath, "/path/to/slang");
    assert.equal(compiler.isSolcJs, false);
  });

  it("forwards binary path, the release's extra args, and the input unchanged to spawnCompile", async () => {
    const compiler = new SlangCompiler(PINNED_VERSION, "/path/to/slang", {
      release: PINNED_RELEASE,
      spawnCompile: fakeSpawnCompile,
    });

    await compiler.compile(sampleInput);

    assert.equal(spawnCompileCalls.length, 1);
    const call = spawnCompileCalls[0];
    assert.equal(call.command, "/path/to/slang");
    // The prerelease row keeps --no-import-callback.
    assert.deepEqual(call.args, ["--standard-json", "--no-import-callback"]);
    // compile() transforms nothing — the plugin's defaults (optimizer mode,
    // debugInfo) are applied at config resolution, so the input reaches the
    // compiler exactly as the build system constructed it.
    assert.equal(call.input, sampleInput);
  });

  it("passes only --standard-json when the release has no extra args", async () => {
    const compiler = new SlangCompiler("0.2.0", "/path/to/slang", {
      release: { minSolidity: "0.8.0", maxSolidity: "0.8.36", extraArgs: [] },
      spawnCompile: fakeSpawnCompile,
    });

    await compiler.compile(sampleInput);

    assert.deepEqual(spawnCompileCalls[0].args, ["--standard-json"]);
  });

  it("returns the output from spawnCompile", async () => {
    const compiler = new SlangCompiler(PINNED_VERSION, "/path/to/slang", {
      release: PINNED_RELEASE,
      spawnCompile: fakeSpawnCompile,
    });

    const result = await compiler.compile(sampleInput);
    assert.equal(result, fakeOutput);
  });
});

describe("addSlangStackTraceSelectors", () => {
  it("populates the wildcard slots when the input is empty", async () => {
    const result = await addSlangStackTraceSelectors({});
    assert.deepEqual(result, {
      "*": {
        "*": [...SLANG_DEBUG_INFO_SELECTORS],
        "": [...SLANG_DEBUG_SYMBOLS_SELECTORS],
      },
    });
  });

  it("appends to an existing wildcard selector list without removing user entries", async () => {
    const result = await addSlangStackTraceSelectors({
      "*": { "*": ["abi", "metadata"] },
    });
    assert.deepEqual(result, {
      "*": {
        "*": ["abi", "metadata", ...SLANG_DEBUG_INFO_SELECTORS],
        "": [...SLANG_DEBUG_SYMBOLS_SELECTORS],
      },
    });
  });

  it('appends debugSymbols to the file-level `[*][""]` slot, keeping outputs like ast', async () => {
    const result = await addSlangStackTraceSelectors({
      "*": { "": ["ast"] },
    });
    assert.ok(result !== undefined, "result should not be undefined");
    assert.deepEqual(result["*"][""], [
      "ast",
      ...SLANG_DEBUG_SYMBOLS_SELECTORS,
    ]);
  });

  it("does not mutate the input object", async () => {
    const input2 = { "*": { "*": ["abi"] } };
    const before = JSON.stringify(input2);
    await addSlangStackTraceSelectors(input2);
    assert.equal(JSON.stringify(input2), before);
  });

  it("accepts undefined input (sets up the wildcard slots)", async () => {
    const result = await addSlangStackTraceSelectors(undefined);
    assert.deepEqual(result, {
      "*": {
        "*": [...SLANG_DEBUG_INFO_SELECTORS],
        "": [...SLANG_DEBUG_SYMBOLS_SELECTORS],
      },
    });
  });
});
