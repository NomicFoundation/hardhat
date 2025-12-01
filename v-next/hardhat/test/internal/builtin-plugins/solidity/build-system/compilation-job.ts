import type { SolcConfig } from "../../../../../src/types/config.js";
import type { HookContext } from "../../../../../src/types/hooks.js";

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { CompilationJobImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/compilation-job.js";
import { DependencyGraphImplementation } from "../../../../../src/internal/builtin-plugins/solidity/build-system/dependency-graph.js";
import { HookManagerImplementation } from "../../../../../src/internal/core/hook-manager.js";
import {
  ResolvedFileType,
  type NpmPackageResolvedFile,
  type ProjectResolvedFile,
  type ResolvedNpmPackage,
} from "../../../../../src/types/solidity.js";

describe("CompilationJobImplementation", () => {
  let dependencyGraph: DependencyGraphImplementation;
  let rootFile: ProjectResolvedFile;
  let npmDependencyFile: NpmPackageResolvedFile;
  let projectDependencyFile: ProjectResolvedFile;
  let solcConfig: SolcConfig;
  let solcLongVersion: string;
  let hooks: HookManagerImplementation;
  let compilationJob: CompilationJobImplementation;

  beforeEach(() => {
    const testHardhatProjectNpmPackage: ResolvedNpmPackage = {
      name: "hardhat-project",
      version: "1.2.3",
      rootFsPath: "/Users/root/",
      inputSourceNameRoot: "project",
    };

    dependencyGraph = new DependencyGraphImplementation();
    rootFile = {
      type: ResolvedFileType.PROJECT_FILE,
      inputSourceName: "root.sol",
      fsPath: "root.sol",
      content: {
        text: "contract Root {}",
        importPaths: [],
        versionPragmas: [],
      },
      package: testHardhatProjectNpmPackage,
    };

    npmDependencyFile = {
      type: ResolvedFileType.NPM_PACKAGE_FILE,
      inputSourceName: "npm:dependency/1.0.0/dependency.sol",
      fsPath: "dependency.sol",
      package: {
        name: "dependency",
        version: "1.0.0",
        rootFsPath: "dependency",
        inputSourceNameRoot: "dependency.sol",
      },
      content: {
        text: "contract Dependency {}",
        importPaths: [],
        versionPragmas: [],
      },
    };
    projectDependencyFile = {
      type: ResolvedFileType.PROJECT_FILE,
      inputSourceName: "dependency.sol",
      fsPath: "dependency.sol",
      content: {
        text: "contract Dependency {}",
        importPaths: [],
        versionPragmas: [],
      },
      package: testHardhatProjectNpmPackage,
    };
    dependencyGraph.addRootFile(rootFile.inputSourceName, rootFile);
    dependencyGraph.addDependency(rootFile, npmDependencyFile);
    dependencyGraph.addDependency(rootFile, projectDependencyFile);
    solcConfig = {
      version: "0.8.0",
      settings: {},
    };
    solcLongVersion = "0.8.0-c7dfd78";

    hooks = new HookManagerImplementation(process.cwd(), []);
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- We don't care about hooks in this context
    hooks.setContext({} as HookContext);
    compilationJob = new CompilationJobImplementation(
      dependencyGraph,
      solcConfig,
      solcLongVersion,
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
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the remappings change", async () => {
        const newDependencyGraph = dependencyGraph.getSubgraph(
          ...dependencyGraph.getRoots().keys().toArray(),
        );

        newDependencyGraph.addDependency(
          rootFile,
          projectDependencyFile,
          "test/:test/=test/",
        );

        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          hooks,
        );

        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("there is an additional root file in the dependency graph", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newRootFile = {
          ...rootFile,
          inputSourceName: "newRoot.sol",
        };
        newDependencyGraph.addRootFile(rootFile.inputSourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, npmDependencyFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        newDependencyGraph.addRootFile("newRoot.sol", newRootFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("there is an additional dependency in the dependency graph", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newDependencyFile = {
          ...projectDependencyFile,
          inputSourceName: "newDependency.sol",
        };
        newDependencyGraph.addRootFile(rootFile.inputSourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, npmDependencyFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        newDependencyGraph.addDependency(rootFile, newDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the content of one of the root files changes", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newRootFile = {
          ...rootFile,
          content: {
            ...rootFile.content,
            text: "contract NewRoot {}",
          },
        };
        newDependencyGraph.addRootFile(
          newRootFile.inputSourceName,
          newRootFile,
        );
        newDependencyGraph.addDependency(newRootFile, npmDependencyFile);
        newDependencyGraph.addDependency(newRootFile, projectDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the content of one of the dependencies changes", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newDependencyFile = {
          ...npmDependencyFile,
          content: {
            ...npmDependencyFile.content,
            text: "contract NewDependency {}",
          },
        };
        newDependencyGraph.addRootFile(rootFile.inputSourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, newDependencyFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          hooks,
        );
        assert.notEqual(
          compilationJob.getBuildId(),
          newCompilationJob.getBuildId(),
        );
      });
      it("the input source name of one of the root files changes", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newRootFile = {
          ...rootFile,
          inputSourceName: "newRoot.sol",
        };
        newDependencyGraph.addRootFile(
          newRootFile.inputSourceName,
          newRootFile,
        );
        newDependencyGraph.addDependency(newRootFile, npmDependencyFile);
        newDependencyGraph.addDependency(newRootFile, projectDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          hooks,
        );
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the input source name of one of the dependencies changes", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newDependencyFile = {
          ...npmDependencyFile,
          inputSourceName: "npm:dependency/1.0.0/newDependency.sol",
        };
        newDependencyGraph.addRootFile(rootFile.inputSourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, newDependencyFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
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

          hooks,
        );
        hooks.registerHandlers("solidity", {
          preprocessProjectFileBeforeBuilding: async (
            context,
            inputSourceName,
            fsPath,
            _fileContent,
            solcVersion,
            next,
          ) => {
            return next(context, inputSourceName, fsPath, "test", solcVersion);
          },
        });
        assert.notEqual(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });

      it("The compilation job is the same, except for the roots", async () => {
        const dependencyGraph1 = new DependencyGraphImplementation();
        dependencyGraph1.addRootFile(rootFile.inputSourceName, rootFile);
        dependencyGraph1.addDependency(rootFile, npmDependencyFile);
        dependencyGraph1.addDependency(npmDependencyFile, rootFile);

        const dependencyGraph2 = new DependencyGraphImplementation();
        dependencyGraph2.addRootFile(
          npmDependencyFile.inputSourceName,
          npmDependencyFile,
        );
        dependencyGraph2.addDependency(npmDependencyFile, rootFile);
        dependencyGraph2.addDependency(rootFile, npmDependencyFile);

        const compilationJob1 = new CompilationJobImplementation(
          dependencyGraph1,
          solcConfig,
          solcLongVersion,
          hooks,
        );

        const compilationJob2 = new CompilationJobImplementation(
          dependencyGraph2,
          solcConfig,
          solcLongVersion,
          hooks,
        );

        assert.notEqual(
          await compilationJob1.getBuildId(),
          await compilationJob2.getBuildId(),
        );
      });
    });
    describe("should not change when", () => {
      it("the version of one of the dependencies changes without it being reflected in the input source name", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        const newDependencyFile = {
          ...npmDependencyFile,
          package: {
            ...npmDependencyFile.package,
            version: "2.0.0",
          },
        };
        newDependencyGraph.addRootFile(rootFile.inputSourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, newDependencyFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
          hooks,
        );
        assert.equal(
          await compilationJob.getBuildId(),
          await newCompilationJob.getBuildId(),
        );
      });
      it("the order of the sources changes", async () => {
        const newDependencyGraph = new DependencyGraphImplementation();
        newDependencyGraph.addRootFile(rootFile.inputSourceName, rootFile);
        newDependencyGraph.addDependency(rootFile, projectDependencyFile);
        newDependencyGraph.addDependency(rootFile, npmDependencyFile);
        const newCompilationJob = new CompilationJobImplementation(
          newDependencyGraph,
          solcConfig,
          solcLongVersion,
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
      let path: string | undefined;
      let content: string;
      let version: string | undefined;

      beforeEach(() => {
        name = undefined;
        path = undefined;
        content = "test";
        version = undefined;

        hooks.registerHandlers("solidity", {
          preprocessProjectFileBeforeBuilding: async (
            context,
            inputSourceName,
            fsPath,
            _fileContent,
            solcVersion,
            next,
          ) => {
            return next(
              context,
              name ?? inputSourceName,
              path ?? fsPath,
              content,
              version ?? solcVersion,
            );
          },
        });
      });

      it("should apply the transformation on all project files", async () => {
        const solcInput = await compilationJob.getSolcInput();
        for (const file of [rootFile, projectDependencyFile]) {
          assert.equal(solcInput.sources[file.inputSourceName].content, "test");
        }
      });

      it("should not apply the transformation on npm dependency files", async () => {
        const solcInput = await compilationJob.getSolcInput();
        assert.equal(
          solcInput.sources[npmDependencyFile.inputSourceName].content,
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
            paramName: "inputSourceName",
          },
        );
      });

      it("should throw when the fs path is modified", async () => {
        path = "newPath";

        await assertRejectsWithHardhatError(
          compilationJob.getSolcInput(),
          HardhatError.ERRORS.CORE.HOOKS.UNEXPECTED_HOOK_PARAM_MODIFICATION,
          {
            hookCategoryName: "solidity",
            hookName: "preprocessProjectFileBeforeBuilding",
            paramName: "fsPath",
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
