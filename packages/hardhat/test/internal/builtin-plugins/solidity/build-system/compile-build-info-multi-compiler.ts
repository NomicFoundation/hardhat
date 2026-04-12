import type { SolidityConfig } from "../../../../../src/types/config.js";
import type { HookContext } from "../../../../../src/types/hooks.js";
import type {
  Compiler,
  SolidityBuildInfo,
  SolidityBuildSystem,
} from "../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import path from "node:path";
import { beforeEach, describe, it, mock } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

import { SolidityBuildSystemImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/build-system.js";
import { HookManagerImplementation } from "../../../../../src/internal/core/hook-manager.js";

describe("SolidityBuildSystem#compileBuildInfo multi-compiler support", () => {
  let solidity: SolidityBuildSystem;
  let hooks: HookManagerImplementation;

  useFixtureProject("solidity/example-project");

  const solidityConfig: SolidityConfig = {
    profiles: {
      default: {
        compilers: [{ version: "0.8.0", settings: {} }],
        overrides: {},
        isolated: false,
        preferWasm: false,
      },
    },
    npmFilesToBuild: [],
    registeredCompilerTypes: ["solc", "mock"],
  };

  beforeEach(async () => {
    hooks = new HookManagerImplementation(process.cwd(), []);
    hooks.setContext({} as HookContext);

    solidity = new SolidityBuildSystemImplementation(hooks, {
      solidityConfig,
      projectRoot: process.cwd(),
      soliditySourcesPaths: [path.join(process.cwd(), "contracts")],
      artifactsPath: path.join(process.cwd(), "artifacts"),
      cachePath: path.join(process.cwd(), "cache"),
      solidityTestsPath: path.join(process.cwd(), "tests"),
    });
  });

  it("should use hooks to compile a non-solc BuildInfo", async () => {
    const mockCompiler: Compiler = {
      type: "mock" as any,
      version: "1.0.0",
      longVersion: "1.0.0+mock",
      isSolcJs: false,
      compilerPath: "mock/path",
      compile: async () => ({ sources: {}, contracts: { "Mock.sol": {} } } as any),
    };

    // Register mock handlers
    const downloadCompilersSpy = mock.fn(async () => {});
    const getCompilerSpy = mock.fn(async () => mockCompiler);
    const invokeSolcSpy = mock.fn(async (_context, compiler, input) => compiler.compile(input));

    hooks.registerHandlers("solidity", {
      downloadCompilers: downloadCompilersSpy,
      getCompiler: getCompilerSpy,
      invokeSolc: invokeSolcSpy,
    });

    const buildInfo: SolidityBuildInfo = {
      _format: "hh3-sol-build-info-1",
      id: "mock-build",
      solcVersion: "1.0.0",
      solcLongVersion: "1.0.0+mock",
      compilerType: "mock",
      userSourceNameMap: {},
      input: {
        language: "Solidity",
        sources: { "Mock.sol": { content: "contract Mock {}" } },
        settings: { optimizer: { enabled: true } },
      } as any,
    };

    const output = await solidity.compileBuildInfo(buildInfo);

    // Verify hooks were called with correct arguments
    assert.equal(downloadCompilersSpy.mock.callCount(), 1);
    const [configs, quiet] = downloadCompilersSpy.mock.calls[0].arguments.slice(1);
    assert.deepEqual(configs[0].type, "mock");
    assert.deepEqual(configs[0].version, "1.0.0");

    assert.equal(getCompilerSpy.mock.callCount(), 1);
    const [config] = getCompilerSpy.mock.calls[0].arguments.slice(1);
    assert.equal(config.type, "mock");

    assert.equal(invokeSolcSpy.mock.callCount(), 1);
    const [invokedCompiler, invokedInput] = invokeSolcSpy.mock.calls[0].arguments.slice(1);
    assert.equal(invokedCompiler, mockCompiler);
    assert.deepEqual(invokedInput, buildInfo.input);

    // Verify output
    assert.ok(output.contracts);
    assert.ok(output.contracts["Mock.sol"]);
  });
});
