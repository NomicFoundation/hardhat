import type {
  SolidityCompilerConfig,
  SolidityConfig,
} from "../../../../../src/types/config.js";
import type { HookContext } from "../../../../../src/types/hooks.js";
import type {
  Compiler,
  CompilerOutput,
  SolidityBuildInfo,
  SolidityBuildInfoOutput,
  SolidityBuildSystem,
} from "../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { before, beforeEach, describe, it, mock } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  createTmpDir,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import {
  createFile,
  ensureDir,
  exists,
  getAllFilesMatching,
  readJsonFile,
  remove,
} from "@nomicfoundation/hardhat-utils/fs";

import { SolidityBuildSystemImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/build-system.js";
import createSolidityHookHandlers from "../../../../../src/internal/builtin-plugins/solidity/hook-handlers/solidity.js";
import { HookManagerImplementation } from "../../../../../src/internal/core/hook-manager.js";

async function emitArtifacts(solidity: SolidityBuildSystem): Promise<void> {
  const rootFilePaths = await solidity.getRootFilePaths();
  const compilationJobsResult = await solidity.getCompilationJobs(
    rootFilePaths,
    {
      isolated: false,
      quiet: true,
    },
  );

  assert.ok(
    compilationJobsResult.success,
    "getCompilationJobs should not error",
  );

  const compilationJobs = compilationJobsResult.compilationJobsPerFile;

  assert.ok(compilationJobs instanceof Map, "compilationJobs should be a Map");

  const artifactsPath = path.join(process.cwd(), "artifacts");

  const buildIds = new Set<string>();
  for (const compilationJob of compilationJobs.values()) {
    const buildId = await compilationJob.getBuildId();
    if (!buildIds.has(buildId)) {
      buildIds.add(buildId);
      const buildInfoOutput = await readJsonFile<SolidityBuildInfoOutput>(
        path.join(artifactsPath, "build-info", `${buildId}.output.json`),
      );
      await solidity.emitArtifacts(compilationJob, buildInfoOutput.output, {
        scope: "contracts",
      });
    }
  }
}

// NOTE: This test is slow because solidity compilers are downloaded.
describe(
  "SolidityBuildSystemImplementation",
  {
    skip: process.env.HARDHAT_DISABLE_SLOW_TESTS === "true",
  },
  () => {
    let actualArtifactsPath: string;
    let actualCachePath: string;
    let expectedArtifactsPath: string;
    let expectedCachePath: string;
    let solidity: SolidityBuildSystemImplementation;

    useFixtureProject("solidity/example-project");
    const tmp = createTmpDir("solidity-build-system-implementation", "test");

    const solidityConfig: SolidityConfig = {
      profiles: {
        default: {
          compilers: [
            {
              version: "0.8.22",
              settings: {},
            },
            {
              version: "0.7.1",
              settings: {},
            },
          ],
          overrides: {},
          isolated: false,
          preferWasm: false,
        },
      },
      npmFilesToBuild: [],
      registeredCompilerTypes: ["solc"],
      splitTestsCompilation: false,
    };

    before(async () => {
      expectedArtifactsPath = path.join(process.cwd(), "artifacts");
      expectedCachePath = path.join(process.cwd(), "cache");
      await remove(expectedArtifactsPath);
      await remove(expectedCachePath);
      const hooks = new HookManagerImplementation(process.cwd(), []);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- We don't care about hooks in this context
      hooks.setContext({} as HookContext);
      hooks.registerHandlers("solidity", await createSolidityHookHandlers());
      solidity = new SolidityBuildSystemImplementation(hooks, {
        solidityConfig,
        projectRoot: process.cwd(),
        soliditySourcesPaths: [path.join(process.cwd(), "contracts")],
        artifactsPath: expectedArtifactsPath,
        cachePath: expectedCachePath,
        solidityTestsPath: path.join(process.cwd(), "tests"),
        coverage: false,
      });
      const rootFilePaths = await solidity.getRootFilePaths();
      await solidity.build(rootFilePaths, {
        force: true,
        isolated: false,
        quiet: true,
      });
    });

    beforeEach(async () => {
      actualArtifactsPath = path.join(tmp.path, "artifacts");
      actualCachePath = path.join(tmp.path, "cache");
      const hooks = new HookManagerImplementation(process.cwd(), []);
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- We don't care about hooks in this context
      hooks.setContext({} as HookContext);
      hooks.registerHandlers("solidity", await createSolidityHookHandlers());
      solidity = new SolidityBuildSystemImplementation(hooks, {
        solidityConfig,
        projectRoot: process.cwd(),
        soliditySourcesPaths: [path.join(process.cwd(), "contracts")],
        artifactsPath: actualArtifactsPath,
        cachePath: actualCachePath,
        solidityTestsPath: path.join(process.cwd(), "tests"),
        coverage: false,
      });
    });

    describe("emitArtifacts", () => {
      it("should successfully emit the artifacts", async () => {
        await emitArtifacts(solidity);

        const expectedArtifactPaths = await getAllFilesMatching(
          expectedArtifactsPath,
          (f) => f.endsWith(".json"),
        );

        for (const expectedArtifactPath of expectedArtifactPaths) {
          const relativeArtifactPath = path.relative(
            expectedArtifactsPath,
            expectedArtifactPath,
          );
          const actualArtifactPath = path.join(
            actualArtifactsPath,
            relativeArtifactPath,
          );
          assert.ok(
            await exists(actualArtifactPath),
            `Artifact file ${relativeArtifactPath} should exist`,
          );
          const expectedArtifact = await readJsonFile(expectedArtifactPath);
          const actualArtifact = await readJsonFile(actualArtifactPath);
          assert.deepEqual(
            actualArtifact,
            expectedArtifact,
            `Artifact file ${relativeArtifactPath} should be the same`,
          );
        }
      });
    });

    describe("cleanupArtifacts", () => {
      let actualArtifactPathsBefore: string[];
      let duplicatedContractNamesDeclarationFilePath: string;

      beforeEach(async () => {
        await emitArtifacts(solidity);
        actualArtifactPathsBefore =
          await getAllFilesMatching(actualArtifactsPath);
        duplicatedContractNamesDeclarationFilePath = path.join(
          actualArtifactsPath,
          "artifacts.d.ts",
        );
      });

      it("should clean up no artifacts when given all root file paths", async () => {
        const remaining = await solidity.cleanupArtifacts(
          await solidity.getRootFilePaths(),
          { scope: "contracts" },
        );

        const actualArtifactPathsAfter = await getAllFilesMatching(
          actualArtifactsPath,
          (f) => f !== duplicatedContractNamesDeclarationFilePath,
        );

        assert.deepEqual(
          actualArtifactPathsAfter.sort(),
          actualArtifactPathsBefore.sort(),
          "No artifacts should be cleaned up",
        );

        const buildInfoDirPrefix =
          path.join(actualArtifactsPath, "build-info") + path.sep;
        const expectedRemaining = actualArtifactPathsAfter
          .filter(
            (f) => f.endsWith(".json") && !f.startsWith(buildInfoDirPrefix),
          )
          .sort();
        assert.deepEqual(
          remaining.sort(),
          expectedRemaining,
          "Returned paths should match the surviving artifact json files",
        );
      });

      it("should not clean up some of the artifacts when given a subset of all root file paths", async () => {
        const rootFilePaths = await solidity.getRootFilePaths();
        const rootFilePathsToCleanUp = rootFilePaths.slice(
          0,
          rootFilePaths.length - 1,
        );

        const remaining = await solidity.cleanupArtifacts(
          rootFilePathsToCleanUp,
          { scope: "contracts" },
        );

        const actualArtifactPathsAfter = await getAllFilesMatching(
          actualArtifactsPath,
          (f) => f !== duplicatedContractNamesDeclarationFilePath,
        );

        assert.ok(
          actualArtifactPathsBefore.length > actualArtifactPathsAfter.length,
          "Some artifacts should be cleaned up",
        );

        const buildInfoDirPrefix =
          path.join(actualArtifactsPath, "build-info") + path.sep;
        const expectedRemaining = actualArtifactPathsAfter
          .filter(
            (f) => f.endsWith(".json") && !f.startsWith(buildInfoDirPrefix),
          )
          .sort();
        assert.deepEqual(
          remaining.sort(),
          expectedRemaining,
          "Returned paths should match the surviving artifact json files",
        );
        assert.ok(
          remaining.length < actualArtifactPathsBefore.length,
          "Returned paths should be fewer than the artifacts present before cleanup",
        );
      });

      it("should clean up all the artifacts when given no root file paths", async () => {
        const remaining = await solidity.cleanupArtifacts([], {
          scope: "contracts",
        });

        const actualArtifactPathsAfter = await getAllFilesMatching(
          actualArtifactsPath,
          (f) => f !== duplicatedContractNamesDeclarationFilePath,
        );

        assert.ok(
          actualArtifactPathsBefore.length > 0,
          "There should be some artifacts to clean up",
        );
        assert.deepEqual(
          actualArtifactPathsAfter,
          [],
          "All artifacts should be cleaned up",
        );
        assert.deepEqual(
          remaining,
          [],
          "Returned paths should be empty when everything is cleaned up",
        );
      });
    });

    describe("build", () => {
      let expectedArtifactPaths: string[];
      let expectedCachePaths: string[];

      before(async () => {
        expectedArtifactPaths = (
          await getAllFilesMatching(expectedArtifactsPath)
        )
          .map((f) => path.relative(expectedArtifactsPath, f))
          .sort();
        expectedCachePaths = (await getAllFilesMatching(expectedCachePath))
          .map((f) => path.relative(expectedCachePath, f))
          .sort();
      });

      it("should build the project deterministically", async () => {
        const rootFilePaths = await solidity.getRootFilePaths();
        await solidity.build(rootFilePaths, {
          force: true,
          isolated: false,
          quiet: true,
        });

        const actualArtifactPaths = (
          await getAllFilesMatching(actualArtifactsPath)
        )
          .map((f) => path.relative(actualArtifactsPath, f))
          .sort();
        const actualCachePaths = (await getAllFilesMatching(actualCachePath))
          .map((f) => path.relative(actualCachePath, f))
          .sort();

        assert.deepEqual(
          actualArtifactPaths,
          expectedArtifactPaths,
          "Artifacts should be the same",
        );
        assert.deepEqual(
          actualCachePaths,
          expectedCachePaths,
          "Cache should be the same",
        );
      });

      it("should recompile the project when given the same input as in the previous call but the force flag is set", async () => {
        const rootFilePaths = await solidity.getRootFilePaths();
        await solidity.build(rootFilePaths, {
          force: true,
          isolated: false,
          quiet: true,
        });

        const runCompilationJobSpy = mock.method(solidity, "runCompilationJob");

        await solidity.build(rootFilePaths, {
          force: true,
          isolated: false,
          quiet: true,
        });

        assert.equal(runCompilationJobSpy.mock.callCount(), 2);
      });

      it("should throw when given a build profile that is not defined", async () => {
        const rootFilePaths = await solidity.getRootFilePaths();

        await assertRejectsWithHardhatError(
          solidity.build(rootFilePaths, {
            force: false,
            isolated: false,
            quiet: true,
            buildProfile: "not-defined",
          }),
          HardhatError.ERRORS.CORE.SOLIDITY.BUILD_PROFILE_NOT_FOUND,
          {
            buildProfileName: "not-defined",
          },
        );
      });

      describe("cleanupArtifacts option", () => {
        const noImportsArtifactRelPath = path.join(
          "contracts",
          "NoImports.sol",
          "NoImports.json",
        );

        async function buildAllThenDropNoImports(
          cleanupArtifacts: boolean | undefined,
        ): Promise<{ noImportsArtifact: string }> {
          const rootFilePaths = await solidity.getRootFilePaths();
          await solidity.build(rootFilePaths, {
            force: true,
            isolated: false,
            quiet: true,
          });

          const noImportsArtifact = path.join(
            actualArtifactsPath,
            noImportsArtifactRelPath,
          );
          assert.ok(
            await exists(noImportsArtifact),
            "NoImports artifact should exist after the initial full build",
          );

          const filteredRoots = rootFilePaths.filter(
            (p) => !p.endsWith(`${path.sep}NoImports.sol`),
          );
          assert.equal(
            filteredRoots.length,
            rootFilePaths.length - 1,
            "Test setup: NoImports.sol should be one of the root file paths",
          );

          await solidity.build(filteredRoots, {
            force: true,
            isolated: false,
            quiet: true,
            cleanupArtifacts,
          });

          return { noImportsArtifact };
        }

        it("should remove stale artifacts when set to true", async () => {
          const { noImportsArtifact } = await buildAllThenDropNoImports(true);

          assert.ok(
            !(await exists(noImportsArtifact)),
            "NoImports artifact should be removed when cleanupArtifacts is true",
          );
        });

        it("should leave stale artifacts in place when set to false", async () => {
          const { noImportsArtifact } = await buildAllThenDropNoImports(false);

          assert.ok(
            await exists(noImportsArtifact),
            "NoImports artifact should remain when cleanupArtifacts is false",
          );
        });

        it("should leave stale artifacts in place when not set", async () => {
          const { noImportsArtifact } =
            await buildAllThenDropNoImports(undefined);

          assert.ok(
            await exists(noImportsArtifact),
            "NoImports artifact should remain when cleanupArtifacts is omitted",
          );
        });

        it("should leave artifacts unchanged when set to true and nothing is stale", async () => {
          const rootFilePaths = await solidity.getRootFilePaths();
          await solidity.build(rootFilePaths, {
            force: true,
            isolated: false,
            quiet: true,
          });

          const buildInfoDirPrefix =
            path.join(actualArtifactsPath, "build-info") + path.sep;
          const artifactJsonPredicate = (f: string) =>
            f.endsWith(".json") && !f.startsWith(buildInfoDirPrefix);

          const artifactsBefore = (
            await getAllFilesMatching(
              actualArtifactsPath,
              artifactJsonPredicate,
            )
          ).sort();

          await solidity.build(rootFilePaths, {
            force: true,
            isolated: false,
            quiet: true,
            cleanupArtifacts: true,
          });

          const artifactsAfter = (
            await getAllFilesMatching(
              actualArtifactsPath,
              artifactJsonPredicate,
            )
          ).sort();

          assert.deepEqual(
            artifactsAfter,
            artifactsBefore,
            "Artifacts should be unchanged when nothing is stale",
          );
        });
      });
    });

    describe("compileBuildInfo", () => {
      it("should compile a valid build info and return matching output", async () => {
        // 1. Build the project first
        const rootFilePaths = await solidity.getRootFilePaths();
        const buildResult = await solidity.build(rootFilePaths, {
          force: true,
          quiet: true,
        });
        assert.ok(buildResult instanceof Map, "Build result should be a Map");

        // 2. Read a build info file from artifacts
        const buildInfoFiles = (
          await getAllFilesMatching(
            path.join(actualArtifactsPath, "build-info"),
            (f) => f.endsWith(".json") && !f.endsWith(".output.json"),
          )
        ).sort();
        assert.ok(
          buildInfoFiles.length > 0,
          "Should have at least one build info file",
        );

        const buildInfo = await readJsonFile<SolidityBuildInfo>(
          buildInfoFiles[0],
        );

        // 3. Call compileBuildInfo
        const output = await solidity.compileBuildInfo(buildInfo, {
          quiet: true,
        });

        // 4. Verify output has expected structure
        assert.ok(
          output.contracts !== undefined || output.errors !== undefined,
          "Output should have contracts or errors",
        );
        assert.ok(
          output.errors === undefined ||
            !output.errors.some((e) => e.severity === "error"),
          "Output should not have compilation errors",
        );
      });

      it("should return compilation errors without throwing", async () => {
        // Create a build info with invalid Solidity code
        const invalidBuildInfo: SolidityBuildInfo = {
          _format: "hh3-sol-build-info-1",
          id: "test-invalid-build-info",
          solcVersion: "0.8.0",
          solcLongVersion: "0.8.0+commit.c7dfd78e",
          userSourceNameMap: { "Invalid.sol": "Invalid.sol" },
          input: {
            language: "Solidity",
            sources: {
              "Invalid.sol": {
                content:
                  "pragma solidity ^0.8.0; contract Invalid { undefined_type x; }",
              },
            },
            settings: {
              optimizer: { enabled: false, runs: 200 },
              outputSelection: {
                "*": {
                  "*": ["abi", "evm.bytecode"],
                },
              },
            },
          },
        };

        // Should not throw
        const output = await solidity.compileBuildInfo(invalidBuildInfo, {
          quiet: true,
        });

        // Should have errors in output
        assert.ok(output.errors !== undefined, "Output should have errors");
        assert.ok(
          output.errors.some((e) => e.severity === "error"),
          "Output should have at least one error",
        );
      });

      it("should use compiler hooks for build infos with a non-solc compiler type", async () => {
        const fakeOutput: CompilerOutput = {
          contracts: {},
          sources: {},
        };
        const customCompiler: Compiler = {
          version: "0.8.22",
          longVersion: "0.8.22+custom",
          compilerPath: "/mock/custom-compiler",
          isSolcJs: false,
          compile: async () => fakeOutput,
        };

        let downloadConfigs: SolidityCompilerConfig[] | undefined;
        let getCompilerConfig: SolidityCompilerConfig | undefined;
        let compileInput: SolidityBuildInfo["input"] | undefined;

        const hooks = new HookManagerImplementation(process.cwd(), []);
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- We don't care about hooks in this context
        hooks.setContext({} as HookContext);
        hooks.registerHandlers("solidity", await createSolidityHookHandlers());
        hooks.registerHandlers("solidity", {
          downloadCompilers: async (_context, compilerConfigs) => {
            downloadConfigs = compilerConfigs;
          },
          getCompiler: async (_context, compilerConfig) => {
            getCompilerConfig = compilerConfig;
            return {
              ...customCompiler,
              compile: async (input) => {
                compileInput = input;
                return await customCompiler.compile(input);
              },
            };
          },
        });

        const buildSystem = new SolidityBuildSystemImplementation(hooks, {
          solidityConfig,
          projectRoot: process.cwd(),
          soliditySourcesPaths: [path.join(process.cwd(), "contracts")],
          artifactsPath: actualArtifactsPath,
          cachePath: actualCachePath,
          solidityTestsPath: path.join(process.cwd(), "tests"),
          coverage: false,
        });

        const buildInfo: SolidityBuildInfo = {
          _format: "hh3-sol-build-info-1",
          id: "solc-0_8_22-custom-test",
          solcVersion: "0.8.22",
          solcLongVersion: "0.8.22+custom",
          compilerType: "custom",
          userSourceNameMap: { "contracts/A.sol": "contracts/A.sol" },
          input: {
            language: "Solidity",
            sources: {
              "contracts/A.sol": { content: "contract A {}" },
            },
            settings: {
              optimizer: { enabled: false, runs: 200 },
              outputSelection: { "*": { "*": ["abi"] } },
            },
          },
        };

        const output = await buildSystem.compileBuildInfo(buildInfo, {
          quiet: true,
        });

        const expectedDownloadConfigs: unknown = [
          {
            type: "custom",
            version: "0.8.22",
            settings: buildInfo.input.settings,
          },
        ];

        assert.equal(output, fakeOutput);
        assert.deepEqual(downloadConfigs, expectedDownloadConfigs);
        assert.deepEqual(getCompilerConfig, downloadConfigs?.[0]);
        assert.equal(compileInput, buildInfo.input);
      });
    });
  },
);

describe("SolidityBuildSystemImplementation.getScope", () => {
  const projectRoot = path.join(path.sep, "project");
  const solidityTestsPath = path.join(projectRoot, "tests");
  const soliditySourcesPaths = [path.join(projectRoot, "contracts")];

  function makeBuildSystem(): SolidityBuildSystemImplementation {
    const hooks = new HookManagerImplementation(projectRoot, []);
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- hooks context is irrelevant for getScope
    hooks.setContext({} as HookContext);
    const solidityConfig: SolidityConfig = {
      profiles: {
        default: {
          compilers: [],
          overrides: {},
          isolated: false,
          preferWasm: false,
        },
      },
      npmFilesToBuild: [],
      registeredCompilerTypes: ["solc"],
      splitTestsCompilation: false,
    };
    return new SolidityBuildSystemImplementation(hooks, {
      solidityConfig,
      projectRoot,
      soliditySourcesPaths,
      artifactsPath: path.join(projectRoot, "artifacts"),
      cachePath: path.join(projectRoot, "cache"),
      solidityTestsPath,
      coverage: false,
    });
  }

  const solidity = makeBuildSystem();

  it("returns 'tests' for a .sol file directly inside solidityTestsPath", async () => {
    assert.equal(
      await solidity.getScope(path.join(solidityTestsPath, "Foo.sol")),
      "tests",
    );
  });

  it("returns 'tests' for a .sol file nested inside solidityTestsPath", async () => {
    assert.equal(
      await solidity.getScope(path.join(solidityTestsPath, "sub", "Foo.sol")),
      "tests",
    );
  });

  it("returns 'contracts' for a file in a directory whose name is a prefix of solidityTestsPath", async () => {
    assert.equal(
      await solidity.getScope(path.join(projectRoot, "tests-extra", "Foo.sol")),
      "contracts",
    );
  });

  it("returns 'contracts' for a plain .sol file inside a sources path", async () => {
    assert.equal(
      await solidity.getScope(path.join(soliditySourcesPaths[0], "Foo.sol")),
      "contracts",
    );
  });

  it("returns 'tests' for a .t.sol file inside a sources path", async () => {
    assert.equal(
      await solidity.getScope(path.join(soliditySourcesPaths[0], "Foo.t.sol")),
      "tests",
    );
  });

  it("returns 'tests' for a .t.sol file nested inside a sources path", async () => {
    assert.equal(
      await solidity.getScope(
        path.join(soliditySourcesPaths[0], "sub", "Foo.t.sol"),
      ),
      "tests",
    );
  });

  it("returns 'contracts' for a .t.sol file in a directory whose name is a prefix of a sources path", async () => {
    assert.equal(
      await solidity.getScope(
        path.join(projectRoot, "contracts-extra", "Foo.t.sol"),
      ),
      "contracts",
    );
  });

  it("returns 'contracts' for a .t.sol file outside any sources path", async () => {
    assert.equal(
      await solidity.getScope(path.join(projectRoot, "elsewhere", "Foo.t.sol")),
      "contracts",
    );
  });

  it("returns 'contracts' for a .sol file outside any sources or tests path", async () => {
    assert.equal(
      await solidity.getScope(path.join(projectRoot, "elsewhere", "Foo.sol")),
      "contracts",
    );
  });
});

describe("SolidityBuildSystemImplementation.getRootFilePaths", () => {
  const tmp = createTmpDir("solidity-build-system-root-files", "test");

  it("Regression test: walks each sources path only once in unified mode", async () => {
    const projectRoot = tmp.path;
    const contractsPath = path.join(projectRoot, "contracts");
    const testsPath = path.join(projectRoot, "tests");

    await ensureDir(contractsPath);
    await ensureDir(testsPath);
    await createFile(path.join(contractsPath, "Foo.sol"));
    await createFile(path.join(contractsPath, "Foo.t.sol"));
    await createFile(path.join(testsPath, "Bar.sol"));

    const hooks = new HookManagerImplementation(projectRoot, []);
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- hooks context is irrelevant for getRootFilePaths
    hooks.setContext({} as HookContext);

    const solidity = new SolidityBuildSystemImplementation(hooks, {
      solidityConfig: {
        profiles: {
          default: {
            compilers: [],
            overrides: {},
            isolated: false,
            preferWasm: false,
          },
        },
        npmFilesToBuild: [],
        registeredCompilerTypes: ["solc"],
        splitTestsCompilation: false,
      },
      projectRoot,
      soliditySourcesPaths: [contractsPath],
      artifactsPath: path.join(projectRoot, "artifacts"),
      cachePath: path.join(projectRoot, "cache"),
      solidityTestsPath: testsPath,
      coverage: false,
    });

    const originalReaddir = fsPromises.readdir;
    let contractsPathReads = 0;

    const readdirMock = mock.method(
      fsPromises,
      "readdir",
      async (...args: Parameters<typeof originalReaddir>) => {
        if (args[0] === contractsPath && args[1]?.withFileTypes === true) {
          contractsPathReads += 1;
        }

        return await Reflect.apply(originalReaddir, fsPromises, args);
      },
    );

    try {
      const rootFilePaths = await solidity.getRootFilePaths();

      assert.equal(
        contractsPathReads,
        1,
        "expected unified root discovery to walk each sources path only once",
      );
      assert.ok(
        rootFilePaths.some((file) => file.endsWith("Foo.sol")),
        "expected roots to include Foo.sol",
      );
      assert.ok(
        rootFilePaths.some((file) => file.endsWith("Foo.t.sol")),
        "expected unified roots to include Foo.t.sol",
      );
      assert.ok(
        rootFilePaths.some((file) => file.endsWith("Bar.sol")),
        "expected unified roots to include tests/Bar.sol",
      );
    } finally {
      readdirMock.mock.restore();
    }
  });
});
