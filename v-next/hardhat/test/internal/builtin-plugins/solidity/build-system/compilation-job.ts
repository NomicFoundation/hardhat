import type { Remapping } from "../../../../../src/internal/builtin-plugins/solidity/build-system/resolver/types.js";
import type { SolcConfig } from "../../../../../src/types/config.js";
import type { HookContext } from "../../../../../src/types/hooks.js";
import type {
  NpmPackageResolvedFile,
  ProjectResolvedFile,
} from "../../../../../src/types/solidity.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { CompilationJobImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/compilation-job.js";
import { DependencyGraphImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph.js";
import {
  NpmPackageResolvedFileImplementation,
  ProjectResolvedFileImplementation,
} from "../../../../../src/internal/builtin-plugins/solidity/build-system/resolved-file.js";
import { HookManagerImplementation } from "../../../../../src/internal/core/hook-manager.js";

describe("CompilationJobImplementation", () => {
  let dependencyGraph: DependencyGraphImplementation;
  let rootFile: ProjectResolvedFile;
  let npmDependencyFile: NpmPackageResolvedFile;
  let projectDependencyFile: ProjectResolvedFile;
  let solcConfig: SolcConfig;
  let solcLongVersion: string;
  let remappings: Remapping[];
  let hooks: HookManagerImplementation;
  let compilationJob: CompilationJobImplementation;

  beforeEach(() => {
    dependencyGraph = new DependencyGraphImplementation();
    rootFile = new ProjectResolvedFileImplementation({
      sourceName: "root.sol",
      fsPath: "root.sol",
      content: {
        text: "contract Root {}",
        importPaths: [],
        versionPragmas: [],
      },
    });
    npmDependencyFile = new NpmPackageResolvedFileImplementation({
      sourceName: "npm:dependency/1.0.0/dependency.sol",
      fsPath: "dependency.sol",
      package: {
        name: "dependency",
        version: "1.0.0",
        rootFsPath: "dependency",
        rootSourceName: "dependency.sol",
      },
      content: {
        text: "contract Dependency {}",
        importPaths: [],
        versionPragmas: [],
      },
    });
    projectDependencyFile = new ProjectResolvedFileImplementation({
      sourceName: "dependency.sol",
      fsPath: "dependency.sol",
      content: {
        text: "contract Dependency {}",
        importPaths: [],
        versionPragmas: [],
      },
    });
    dependencyGraph.addRootFile(rootFile.sourceName, rootFile);
    dependencyGraph.addDependency(rootFile, npmDependencyFile);
    dependencyGraph.addDependency(rootFile, projectDependencyFile);
    solcConfig = {
      version: "0.8.0",
      settings: {},
    };
    solcLongVersion = "0.8.0-c7dfd78";
    remappings = [];
    hooks = new HookManagerImplementation(process.cwd(), []);
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- We don't care about hooks in this context
    hooks.setContext({} as HookContext);
    compilationJob = new CompilationJobImplementation(
      dependencyGraph,
      solcConfig,
      solcLongVersion,
      remappings,
      hooks,
    );
  });

  describe("getBuildId", () => {
    describe("should change when", () => {
      it("the solc long version changes", async () => {
        const newCompilationJob = new CompilationJobImplementation(
          dependencyGraph,
          solcConfig,
          "0.8.0-df193b1",
          remappings,
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the settings change", async () => {
        const newCompilationJob = new CompilationJobImplementation(
          dependencyGraph,
          {
            ...solcConfig,
            settings: {
              optimizer: {
                enabled: true,
                runs: 200,
              },
            },
          },
          solcLongVersion,
          remappings,
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the remappings change", async () => {
        const newCompilationJob = new CompilationJobImplementation(
          dependencyGraph,
          solcConfig,
          solcLongVersion,
          [
            {
              context: "test",
              prefix: "test",
              target: "test",
            },
          ],
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("there is an additional root file in the dependency graph", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newRootFile = new ProjectResolvedFileImplementation({
          ...rootFile,
          sourceName: "newRoot.sol",
        });
        newDependencyGraph.addRootFile(rootFile.sourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, npmDependencyFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        newDependencyGraph.addRootFile("newRoot.sol", newRootFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          remappings,
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("there is an additional dependency in the dependency graph", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newDependencyFile = new ProjectResolvedFileImplementation({
          ...projectDependencyFile,
          sourceName: "newDependency.sol",
        });
        newDependencyGraph.addRootFile(rootFile.sourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, npmDependencyFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        newDependencyGraph.addDependency(rootFile, newDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          remappings,
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the content of one of the root files changes", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newRootFile = new ProjectResolvedFileImplementation({
          ...rootFile,
          content: {
            ...rootFile.content,
            text: "contract NewRoot {}",
          },
        });
        newDependencyGraph.addRootFile(newRootFile.sourceName, newRootFile);
        newDependencyGraph.addDependency(newRootFile, npmDependencyFile);
        newDependencyGraph.addDependency(newRootFile, projectDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          remappings,
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the content of one of the dependencies changes", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newDependencyFile = new NpmPackageResolvedFileImplementation({
          ...npmDependencyFile,
          content: {
            ...npmDependencyFile.content,
            text: "contract NewDependency {}",
          },
        });
        newDependencyGraph.addRootFile(rootFile.sourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, newDependencyFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          remappings,
          hooks,
        );
        assert.notEqual(
          compilationJob.getBuildId(),
          newCompilationJob.getBuildId(),
        );
      });
      it("the source name of one of the root files changes", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newRootFile = new ProjectResolvedFileImplementation({
          ...rootFile,
          sourceName: "newRoot.sol",
        });
        newDependencyGraph.addRootFile(newRootFile.sourceName, newRootFile);
        newDependencyGraph.addDependency(newRootFile, npmDependencyFile);
        newDependencyGraph.addDependency(newRootFile, projectDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          remappings,
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the source name of one of the dependencies changes", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newDependencyFile = new NpmPackageResolvedFileImplementation({
          ...npmDependencyFile,
          sourceName: "npm:dependency/1.0.0/newDependency.sol",
        });
        newDependencyGraph.addRootFile(rootFile.sourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, newDependencyFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          remappings,
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the solc input is modified via the preprocessSolcInputBeforeBuilding hook", async () => {
        await compilationJob.getSolcInput();
        const newCompilationJob = new CompilationJobImplementation(
          dependencyGraph,
          solcConfig,
          solcLongVersion,
          remappings,
          hooks,
        );
        hooks.registerHandlers("solidity", {
          preprocessSolcInputBeforeBuilding: async (
            context,
            solcInput,
            next,
          ) => {
            solcInput.sources.test = { content: "test" };
            return next(context, solcInput);
          },
        });
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the project file is modified via the preprocessProjectFileBeforeBuilding hook", async () => {
        await compilationJob.getSolcInput();
        const newCompilationJob = new CompilationJobImplementation(
          dependencyGraph,
          solcConfig,
          solcLongVersion,
          remappings,
          hooks,
        );
        hooks.registerHandlers("solidity", {
          preprocessProjectFileBeforeBuilding: async (
            context,
            sourceName,
            _fileContent,
            solcVersion,
            next,
          ) => {
            return next(context, sourceName, "test", solcVersion);
          },
        });
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
    });
    describe("should not change when", () => {
      it("the version of one of the dependencies changes without it being reflected in the source name", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newDependencyFile = new NpmPackageResolvedFileImplementation({
          ...npmDependencyFile,
          package: {
            ...npmDependencyFile.package,
            version: "2.0.0",
          },
        });
        newDependencyGraph.addRootFile(rootFile.sourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, newDependencyFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          remappings,
          hooks,
        );
        assert.equal(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the order of the sources changes", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        newDependencyGraph.addRootFile(rootFile.sourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        newDependencyGraph.addDependency(rootFile, npmDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          remappings,
          hooks,
        );
        assert.equal(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
    });
  });

  describe("getSolcInput", () => {
    it("should merge the user's outputSelection with our defaults", async () => {
      const newCompilationJob = new CompilationJobImplementation(
        dependencyGraph,
        {
          ...solcConfig,
          settings: {
            outputSelection: {
              "*": {
                "*": ["storageLayout"],
              },
            },
          },
        },
        solcLongVersion,
        remappings,
        hooks,
      );
      const solcInput = await newCompilationJob.getSolcInput();
      assert.deepEqual(solcInput.settings.outputSelection, {
        "*": {
          "*": [
            "abi",
            "evm.bytecode",
            "evm.deployedBytecode",
            "evm.methodIdentifiers",
            "metadata",
            "storageLayout",
          ],
          "": ["ast"],
        },
      });
    });

    it("should dedupe and sort the merged outputSelection", async () => {
      const newCompilationJob = new CompilationJobImplementation(
        dependencyGraph,
        {
          ...solcConfig,
          settings: {
            outputSelection: {
              "*": {
                "*": ["storageLayout", "storageLayout", "abi", "abi"],
              },
            },
          },
        },
        solcLongVersion,
        remappings,
      );
      const solcInput = await newCompilationJob.getSolcInput();
      assert.deepEqual(solcInput.settings.outputSelection, {
        "*": {
          "*": [
            "abi",
            "evm.bytecode",
            "evm.deployedBytecode",
            "evm.methodIdentifiers",
            "metadata",
            "storageLayout",
          ],
          "": ["ast"],
        },
      });
    });

    describe("with preprocessSolcInputBeforeBuilding hook", () => {
      let content: string;

      beforeEach(() => {
        content = "test";
        hooks.registerHandlers("solidity", {
          preprocessSolcInputBeforeBuilding: async (
            context,
            solcInput,
            next,
          ) => {
            solcInput.sources.test = { content };
            return next(context, solcInput);
          },
        });
      });

      it("should apply the transformation", async () => {
        const solcInput = await compilationJob.getSolcInput();
        assert.equal(solcInput.sources.test.content, "test");
      });

      it("should apply the transformation only once", async () => {
        const solcInput = await compilationJob.getSolcInput();
        assert.equal(solcInput.sources.test.content, "test");
        content = "test2";
        const solcInput2 = await compilationJob.getSolcInput();
        assert.equal(solcInput2.sources.test.content, "test");
      });
    });

    describe("with preprocessProjectFileBeforeBuilding hook", () => {
      let name: string | undefined;
      let content: string;
      let version: string | undefined;

      beforeEach(() => {
        name = undefined;
        content = "test";
        version = undefined;

        hooks.registerHandlers("solidity", {
          preprocessProjectFileBeforeBuilding: async (
            context,
            sourceName,
            _fileContent,
            solcVersion,
            next,
          ) => {
            return next(
              context,
              name ?? sourceName,
              content,
              version ?? solcVersion,
            );
          },
        });
      });

      it("should apply the transformation on all project files", async () => {
        const solcInput = await compilationJob.getSolcInput();
        for (const file of [rootFile, projectDependencyFile]) {
          assert.equal(solcInput.sources[file.sourceName].content, "test");
        }
      });

      it("should not apply the transformation on npm dependency files", async () => {
        const solcInput = await compilationJob.getSolcInput();
        assert.equal(
          solcInput.sources[npmDependencyFile.sourceName].content,
          npmDependencyFile.content.text,
        );
      });

      it("should throw when the name is modified", async () => {
        name = "newName";

        await assertRejectsWithHardhatError(
          compilationJob.getSolcInput(),
          HardhatError.ERRORS.CORE.HOOKS.UNEXPECTED_HOOK_PARAM_MODIFICATION,
          {
            hookCategoryName: "solidity",
            hookName: "preprocessProjectFileBeforeBuilding",
            paramName: "sourceName",
          },
        );
      });

      it("should throw when the solc version is modified", async () => {
        version = "0.0.0";

        await assertRejectsWithHardhatError(
          compilationJob.getSolcInput(),
          HardhatError.ERRORS.CORE.HOOKS.UNEXPECTED_HOOK_PARAM_MODIFICATION,
          {
            hookCategoryName: "solidity",
            hookName: "preprocessProjectFileBeforeBuilding",
            paramName: "solcVersion",
          },
        );
      });
    });
  });
});
