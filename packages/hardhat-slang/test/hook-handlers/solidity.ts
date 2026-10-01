/* eslint-disable @typescript-eslint/no-non-null-assertion -- test */
import type { SolidityCompilerConfig } from "hardhat/types/config";
import type { CompilerInput, CompilerOutput } from "hardhat/types/solidity";

import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  makeWorkspaceTmpDir,
  safeRemoveTmpDir,
} from "@nomicfoundation/hardhat-test-utils";
import { ensureDir, exists } from "@nomicfoundation/hardhat-utils/fs";
import {
  resetMockCacheDir,
  setMockCacheDir,
} from "@nomicfoundation/hardhat-utils/global-dir";

import { SLANG_RELEASES } from "../../src/internal/constants.js";
import { getSlangBinaryPath } from "../../src/internal/downloader.js";
import solidityHookHandlers, {
  parseSlangVersion,
} from "../../src/internal/hook-handlers/solidity.js";

const PINNED_VERSION = "0.1.0-pre.2026-10-01";
const PINNED_RELEASE = SLANG_RELEASES[PINNED_VERSION];

// Helper to create a compiler config
function createSolidityCompilerConfig(
  overrides: Partial<SolidityCompilerConfig> = {},
): SolidityCompilerConfig {
  return {
    version: "0.8.34",
    settings: {
      optimizer: {},
      outputSelection: {},
    },
    ...overrides,
  };
}

// A hook context whose config pins the given slang release, or none for null
function createContext(slangVersion: string | null = PINNED_VERSION): any {
  return { config: { slang: { version: slangVersion ?? undefined } } };
}

// A mock "next" function for getCompiler
function createGetCompilerMockNext() {
  let called = false;
  const mockCompiler = {
    version: "0.8.34",
    longVersion: "0.8.34+commit.abc123",
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

describe("parseSlangVersion", () => {
  it("parses version from stable release output", () => {
    assert.equal(
      parseSlangVersion(
        "solx, LLVM-based Solidity compiler for the EVM v0.1.3, LLVM revision: v1.0.2, LLVM build: a33d492",
      ),
      "0.1.3",
    );
  });

  it("parses version from nightly build output", () => {
    assert.equal(
      parseSlangVersion(
        "solx v0.1.4, LLVM-based Solidity compiler for the EVM, Front end: solc, LLVM build: 12f24e07",
      ),
      "0.1.4",
    );
  });

  it("parses the prerelease build's banner, which names the Slang front end", () => {
    assert.equal(
      parseSlangVersion(
        "solx v0.1.8, LLVM-based Solidity compiler for the EVM, Front end: Slang, LLVM build: e7c67b95\nVersion: 0.8.37",
      ),
      "0.1.8",
    );
  });

  it("parses pre-release version", () => {
    assert.equal(
      parseSlangVersion("solx v0.2.0-alpha.1, LLVM-based Solidity compiler"),
      "0.2.0-alpha.1",
    );
  });
});

describe("hardhat-slang solidity hook handler", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await makeWorkspaceTmpDir("slang-solidity-hooks");
    setMockCacheDir(tmpDir);
  });

  afterEach(async () => {
    resetMockCacheDir();
    await safeRemoveTmpDir(tmpDir);
  });

  // Puts a fake binary where the downloader would cache the pinned prerelease, so
  // the hooks take their cached path and never reach the network.
  async function cacheFakePinnedBinary(): Promise<string> {
    const binaryPath = await getSlangBinaryPath(PINNED_VERSION, PINNED_RELEASE);
    await ensureDir(path.dirname(binaryPath));
    await writeFile(binaryPath, "#!/bin/sh\necho fake slang\n");
    return binaryPath;
  }

  describe("downloadCompilers", () => {
    it("is defined on the hook handler", async () => {
      const hooks = await solidityHookHandlers();

      assert.ok(
        hooks.downloadCompilers !== undefined,
        "downloadCompilers hook should be defined",
      );
    });

    it("does nothing when no slang-typed compilers present", async () => {
      const hooks = await solidityHookHandlers();

      // All configs are solc (no type or type undefined), and nothing is
      // pinned: the hook must not even look at slang.version.
      const configs: SolidityCompilerConfig[] = [
        createSolidityCompilerConfig({ type: undefined }),
        createSolidityCompilerConfig({ type: "solc" }),
      ];

      await hooks.downloadCompilers!(createContext(null), configs, true);

      assert.equal(
        await exists(await getSlangBinaryPath(PINNED_VERSION, PINNED_RELEASE)),
        false,
        "nothing should have been downloaded",
      );
    });

    it("skips download when every slang config has a custom path", async () => {
      const hooks = await solidityHookHandlers();

      const configs: SolidityCompilerConfig[] = [
        createSolidityCompilerConfig({
          type: "slang",
          version: "0.8.34",
          path: "/custom/path/to/slang",
        }),
      ];

      // Not pinned either: a custom path never needs the release table.
      await hooks.downloadCompilers!(createContext(null), configs, true);

      assert.equal(
        await exists(await getSlangBinaryPath(PINNED_VERSION, PINNED_RELEASE)),
        false,
        "nothing should have been downloaded",
      );
    });

    it("uses the cached binary of the pinned release for every slang Solidity version", async () => {
      const hooks = await solidityHookHandlers();
      await cacheFakePinnedBinary();

      const configs: SolidityCompilerConfig[] = [
        createSolidityCompilerConfig({ type: "slang", version: "0.8.34" }),
        createSolidityCompilerConfig({ type: "slang", version: "0.8.20" }),
      ];

      // Two Solidity versions, one pinned release: the hook must resolve
      // without any download attempt (there is no network in this test).
      await hooks.downloadCompilers!(createContext(), configs, true);

      assert.equal(configs[0].path, undefined, "paths must not be mutated");
      assert.equal(configs[1].path, undefined, "paths must not be mutated");
    });

    it("throws an invariant error when slang.version isn't pinned but a download is needed", async () => {
      const hooks = await solidityHookHandlers();

      const configs: SolidityCompilerConfig[] = [
        createSolidityCompilerConfig({ type: "slang", version: "0.8.34" }),
      ];

      await assertRejectsWithHardhatError(
        hooks.downloadCompilers!(createContext(null), configs, true),
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        {
          message:
            "slang.version is not set — this should have been caught by config validation",
        },
      );
    });
  });

  describe("getCompiler", () => {
    it("is defined on the hook handler", async () => {
      const hooks = await solidityHookHandlers();

      assert.ok(
        hooks.getCompiler !== undefined,
        "getCompiler hook should be defined",
      );
    });

    it("passes through to next for non-slang compiler configs", async () => {
      const hooks = await solidityHookHandlers();

      const compilerConfig = createSolidityCompilerConfig({ type: "solc" });
      const mockNext = createGetCompilerMockNext();

      const result = await hooks.getCompiler!(
        createContext(null),
        compilerConfig,
        mockNext.next,
      );

      assert.ok(mockNext.wasCalled(), "next should have been called");
      assert.equal(result, mockNext.compiler);
    });

    it("passes through to next for undefined type", async () => {
      const hooks = await solidityHookHandlers();

      const compilerConfig = createSolidityCompilerConfig({ type: undefined });
      const mockNext = createGetCompilerMockNext();

      const result = await hooks.getCompiler!(
        createContext(null),
        compilerConfig,
        mockNext.next,
      );

      assert.ok(mockNext.wasCalled(), "next should have been called");
      assert.equal(result, mockNext.compiler);
    });

    it("returns a SlangCompiler for the pinned release when its binary is cached", async () => {
      const hooks = await solidityHookHandlers();
      const binaryPath = await cacheFakePinnedBinary();

      const compilerConfig = createSolidityCompilerConfig({
        type: "slang",
        version: "0.8.34",
      });
      const mockNext = createGetCompilerMockNext();

      const compiler = await hooks.getCompiler!(
        createContext(),
        compilerConfig,
        mockNext.next,
      );

      assert.ok(
        !mockNext.wasCalled(),
        "next should NOT have been called for slang type",
      );
      assert.equal(compiler.compilerPath, binaryPath);
      assert.equal(compiler.version, PINNED_VERSION);
      assert.equal(compiler.longVersion, `${PINNED_VERSION}+slang`);
      assert.equal(compiler.isSolcJs, false);
    });

    it("throws an invariant error when the pinned binary isn't cached", async () => {
      const hooks = await solidityHookHandlers();

      const compilerConfig = createSolidityCompilerConfig({
        type: "slang",
        version: "0.8.34",
      });
      const mockNext = createGetCompilerMockNext();

      await assertRejectsWithHardhatError(
        hooks.getCompiler!(createContext(), compilerConfig, mockNext.next),
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        {
          message: `slang binary not found at ${await getSlangBinaryPath(PINNED_VERSION, PINNED_RELEASE)} — downloadCompilers should have been called first`,
        },
      );
    });

    it("throws an invariant error when slang.version isn't pinned", async () => {
      const hooks = await solidityHookHandlers();

      const compilerConfig = createSolidityCompilerConfig({
        type: "slang",
        version: "0.8.34",
      });
      const mockNext = createGetCompilerMockNext();

      await assertRejectsWithHardhatError(
        hooks.getCompiler!(createContext(null), compilerConfig, mockNext.next),
        HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
        {
          message:
            "slang.version is not set — this should have been caught by config validation",
        },
      );
    });

    it("throws HardhatError when path does not exist", async () => {
      const hooks = await solidityHookHandlers();

      const compilerConfig = createSolidityCompilerConfig({
        type: "slang",
        version: "0.8.34",
        path: "/nonexistent/path/to/slang",
      });
      const mockNext = createGetCompilerMockNext();

      await assertRejectsWithHardhatError(
        hooks.getCompiler!(createContext(null), compilerConfig, mockNext.next),
        HardhatError.ERRORS.HARDHAT_SLANG.GENERAL.BINARY_NOT_FOUND,
        {
          path: "/nonexistent/path/to/slang",
        },
      );
    });

    it("returns SlangCompiler with version from binary when path is provided", async () => {
      // Use the real prerelease binary if it is in the global cache, skip otherwise
      resetMockCacheDir();
      const cachedPath = await getSlangBinaryPath(
        PINNED_VERSION,
        PINNED_RELEASE,
      );
      if (!(await exists(cachedPath))) {
        return;
      }

      const hooks = await solidityHookHandlers();

      const compilerConfig = createSolidityCompilerConfig({
        type: "slang",
        version: "0.8.34",
        path: cachedPath,
      });
      const mockNext = createGetCompilerMockNext();

      const compiler = await hooks.getCompiler!(
        createContext(null),
        compilerConfig,
        mockNext.next,
      );

      assert.ok(
        !mockNext.wasCalled(),
        "next should NOT have been called for slang type",
      );
      assert.equal(compiler.compilerPath, cachedPath);
      // Version should be parsed from the binary, not from config
      assert.match(compiler.version, /^\d+\.\d+\.\d+/);
      assert.equal(compiler.longVersion, `${compiler.version}+slang`);
    });
  });
});
