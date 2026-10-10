import type { SlangRelease } from "../src/internal/constants.js";
import type { CompilerInput, CompilerOutput } from "hardhat/types/solidity";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { SLANG_RELEASES } from "../src/internal/constants.js";
import {
  SLANG_DEBUG_INFO_SELECTORS,
  SlangCompiler,
  addSlangDebugInfoSelectors,
} from "../src/internal/slang-compiler.js";

const PINNED_VERSION = "0.1.0-pre.2026-10-01";
const PINNED_RELEASE = SLANG_RELEASES[PINNED_VERSION];

// What a real release row is expected to look like once the compiler accepts
// the target Solidity version: no import-callback flag, a version flag.
const RELEASE_WITH_VERSION_FLAG: SlangRelease = {
  minSolidity: "0.8.0",
  maxSolidity: "0.8.36",
  extraArgs: [],
  targetVersionFlag: "--solidity-version",
};

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
      targetSolidityVersion: "0.8.34",
    });

    assert.equal(compiler.version, PINNED_VERSION);
    assert.equal(compiler.longVersion, `${PINNED_VERSION}+slang`);
    assert.equal(compiler.compilerPath, "/path/to/slang");
    assert.equal(compiler.isSolcJs, false);
  });

  it("forwards binary path, the release's extra args, and the input unchanged to spawnCompile", async () => {
    const compiler = new SlangCompiler(PINNED_VERSION, "/path/to/slang", {
      release: PINNED_RELEASE,
      targetSolidityVersion: "0.8.34",
      spawnCompile: fakeSpawnCompile,
    });

    await compiler.compile(sampleInput);

    assert.equal(spawnCompileCalls.length, 1);
    const call = spawnCompileCalls[0];
    assert.equal(call.command, "/path/to/slang");
    // The prerelease row keeps --no-import-callback and has no version flag, so
    // the prerelease binary is never given an argument it rejects.
    assert.deepEqual(call.args, ["--standard-json", "--no-import-callback"]);
    // compile() transforms nothing — the plugin's defaults (optimizer mode,
    // debugInfo) are applied at config resolution, so the input reaches the
    // compiler exactly as the build system constructed it.
    assert.equal(call.input, sampleInput);
  });

  it("passes only --standard-json when the release has no extra args or version flag", async () => {
    const compiler = new SlangCompiler("0.2.0", "/path/to/slang", {
      release: { minSolidity: "0.8.0", maxSolidity: "0.8.36", extraArgs: [] },
      targetSolidityVersion: "0.8.34",
      spawnCompile: fakeSpawnCompile,
    });

    await compiler.compile(sampleInput);

    assert.deepEqual(spawnCompileCalls[0].args, ["--standard-json"]);
  });

  it("appends the release's version flag and the target Solidity version", async () => {
    const compiler = new SlangCompiler("0.2.0", "/path/to/slang", {
      release: RELEASE_WITH_VERSION_FLAG,
      targetSolidityVersion: "0.8.20",
      spawnCompile: fakeSpawnCompile,
    });

    await compiler.compile(sampleInput);

    assert.deepEqual(spawnCompileCalls[0].args, [
      "--standard-json",
      "--solidity-version",
      "0.8.20",
    ]);
  });

  it("puts the release's extra args before the version flag", async () => {
    const compiler = new SlangCompiler("0.2.0", "/path/to/slang", {
      release: {
        ...RELEASE_WITH_VERSION_FLAG,
        extraArgs: ["--no-import-callback"],
      },
      targetSolidityVersion: "0.8.20",
      spawnCompile: fakeSpawnCompile,
    });

    await compiler.compile(sampleInput);

    assert.deepEqual(spawnCompileCalls[0].args, [
      "--standard-json",
      "--no-import-callback",
      "--solidity-version",
      "0.8.20",
    ]);
  });

  it("gives two Solidity versions the same binary and long version, differing only in the target", async () => {
    const forNewest = new SlangCompiler("0.2.0", "/path/to/slang", {
      release: RELEASE_WITH_VERSION_FLAG,
      targetSolidityVersion: "0.8.34",
      spawnCompile: fakeSpawnCompile,
    });
    const forOlder = new SlangCompiler("0.2.0", "/path/to/slang", {
      release: RELEASE_WITH_VERSION_FLAG,
      targetSolidityVersion: "0.8.20",
      spawnCompile: fakeSpawnCompile,
    });

    // Core requires longVersion to be deterministic per compiler version.
    assert.equal(forNewest.compilerPath, forOlder.compilerPath);
    assert.equal(forNewest.longVersion, forOlder.longVersion);

    await forNewest.compile(sampleInput);
    await forOlder.compile(sampleInput);

    assert.deepEqual(
      spawnCompileCalls.map((c) => c.args.at(-1)),
      ["0.8.34", "0.8.20"],
    );
  });

  it("returns the output from spawnCompile", async () => {
    const compiler = new SlangCompiler(PINNED_VERSION, "/path/to/slang", {
      release: PINNED_RELEASE,
      targetSolidityVersion: "0.8.34",
      spawnCompile: fakeSpawnCompile,
    });

    const result = await compiler.compile(sampleInput);
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
    const input2 = { "*": { "*": ["abi"] } };
    const before = JSON.stringify(input2);
    await addSlangDebugInfoSelectors(input2);
    assert.equal(JSON.stringify(input2), before);
  });

  it("accepts undefined input (sets up the wildcard slot)", async () => {
    const result = await addSlangDebugInfoSelectors(undefined);
    assert.deepEqual(result, {
      "*": { "*": [...SLANG_DEBUG_INFO_SELECTORS] },
    });
  });
});
