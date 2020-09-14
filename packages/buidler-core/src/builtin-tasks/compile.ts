import chalk from "chalk";
import debug from "debug";
import fsExtra from "fs-extra";
import path from "path";

import {
  Artifacts,
  getArtifactFromContractOutput,
} from "../internal/artifacts";
import { internalTask, task } from "../internal/core/config/config-env";
import { BuidlerError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import {
  CompilationGroupsFailure,
  CompilationGroupsSuccess,
  getCompilationGroupFromFile,
  getCompilationGroupsFromConnectedComponent,
  ICompilationGroup,
  isCompilationGroupsSuccess,
  mergeCompilationGroupsWithoutBug,
} from "../internal/solidity/compilationGroup";
import { Compiler } from "../internal/solidity/compiler";
import { getInputFromCompilationGroup } from "../internal/solidity/compiler/compiler-input";
import { MatchingCompilerFailure } from "../internal/solidity/compilerMatch";
import {
  DependencyGraph,
  IDependencyGraph,
} from "../internal/solidity/dependencyGraph";
import { Parser } from "../internal/solidity/parse";
import { ResolvedFile, Resolver } from "../internal/solidity/resolver";
import { localPathToSourceName } from "../internal/solidity/source-names";
import { glob } from "../internal/util/glob";
import { pluralize } from "../internal/util/strings";
import { SolcInput } from "../types";

import {
  TASK_COMPILE,
  TASK_COMPILE_CHECK_ERRORS,
  TASK_COMPILE_COMPILE,
  TASK_COMPILE_COMPILE_GROUP,
  TASK_COMPILE_COMPILE_GROUPS,
  TASK_COMPILE_COMPILE_SOLCJS,
  TASK_COMPILE_EMIT_ARTIFACTS,
  TASK_COMPILE_FILTER_COMPILATION_GROUPS,
  TASK_COMPILE_GET_ARTIFACT_FROM_COMPILATION_OUTPUT,
  TASK_COMPILE_GET_COMPILATION_GROUP_FOR_FILE,
  TASK_COMPILE_GET_COMPILATION_GROUPS,
  TASK_COMPILE_GET_COMPILATION_GROUPS_FAILURES_MESSAGE,
  TASK_COMPILE_GET_COMPILATION_TASKS,
  TASK_COMPILE_GET_COMPILER_INPUT,
  TASK_COMPILE_GET_DEPENDENCY_GRAPH,
  TASK_COMPILE_GET_SOURCE_NAMES,
  TASK_COMPILE_GET_SOURCE_PATHS,
  TASK_COMPILE_HANDLE_COMPILATION_GROUPS_FAILURES,
  TASK_COMPILE_LOG_COMPILATION_ERRORS,
  TASK_COMPILE_LOG_COMPILE_GROUP_END,
  TASK_COMPILE_LOG_COMPILE_GROUP_START,
  TASK_COMPILE_LOG_NOTHING_TO_COMPILE,
  TASK_COMPILE_MERGE_COMPILATION_GROUPS,
  TASK_COMPILE_SOLIDITY,
} from "./task-names";
import type { SolidityFilesCache } from "./utils/solidity-files-cache";

interface CompilationError {
  error: any;
  severity: "warning" | "error";
  isConsole: boolean;
}

function isConsoleLogError(error: any): boolean {
  return (
    error.type === "TypeError" &&
    typeof error.message === "string" &&
    error.message.includes("log") &&
    error.message.includes("type(library console)")
  );
}

const log = debug("buidler:core:tasks:compile");

export default function () {
  /**
   * Returns a list of absolute paths to all the solidity files in the project.
   * This list doesn't include dependencies, for example solidity files inside
   * node_modules.
   *
   * This is the right task to override to change how the solidity files of the
   * project are obtained.
   */
  internalTask(
    TASK_COMPILE_GET_SOURCE_PATHS,
    async (_, { config }): Promise<string[]> => {
      const paths = await glob(path.join(config.paths.sources, "**/*.sol"));

      return paths;
    }
  );

  /**
   * Receives a list of absolute paths and returns a list of source names
   * corresponding to each path. For example, receives
   * ["/home/user/project/contracts/Foo.sol"] and returns
   * ["contracts/Foo.sol"]. These source names will be used when the solc input
   * is generated.
   */
  internalTask(
    TASK_COMPILE_GET_SOURCE_NAMES,
    async (
      { sourcePaths }: { sourcePaths: string[] },
      { config }
    ): Promise<string[]> => {
      const sourceNames = await Promise.all(
        sourcePaths.map((p) => localPathToSourceName(config.paths.root, p))
      );

      return sourceNames;
    }
  );

  /**
   * Receives a list of source names and returns a dependency graph. This task
   * is responsible for both resolving dependencies (like getting files from
   * node_modules) and generating the graph.
   */
  internalTask(
    TASK_COMPILE_GET_DEPENDENCY_GRAPH,
    async (
      {
        sourceNames,
        solidityFilesCache,
      }: { sourceNames: string[]; solidityFilesCache: SolidityFilesCache },
      { config }
    ): Promise<IDependencyGraph> => {
      const parser = new Parser(solidityFilesCache ?? {});
      const resolver = new Resolver(config.paths.root, parser);

      const resolvedFiles = await Promise.all(
        sourceNames.map((sn) => resolver.resolveSourceName(sn))
      );
      const dependencyGraph = await DependencyGraph.createFromResolvedFiles(
        resolver,
        resolvedFiles
      );

      return dependencyGraph;
    }
  );

  /**
   * Receives a dependency graph and a file in it, and returns the compilation
   * group for that file. The compilation group should have everything that is
   * necessary to compile that file: a compiler config to be used and a list of
   * files to use as input of the compilation.
   *
   * If the file cannot be compiled, a MatchingCompilerFailure should be
   * returned instead.
   *
   * This is the right task to override to change the compiler configuration.
   * For example, if you want to change the compiler settings when targetting
   * rinkeby, you could do something like this:
   *
   *   const compilationGroup = await runSuper();
   *   if (config.network.name === 'rinkeby') {
   *     compilationGroup.solidityConfig.settings = newSettings;
   *   }
   *   return compilationGroup;
   *
   */
  internalTask(
    TASK_COMPILE_GET_COMPILATION_GROUP_FOR_FILE,
    async (
      {
        dependencyGraph,
        file,
        solidityFilesCache,
      }: {
        dependencyGraph: IDependencyGraph;
        file: ResolvedFile;
        solidityFilesCache: SolidityFilesCache;
      },
      { config }
    ): Promise<ICompilationGroup | MatchingCompilerFailure> => {
      return getCompilationGroupFromFile(
        dependencyGraph,
        file,
        config.solidity,
        solidityFilesCache
      );
    }
  );

  /**
   * Receives a dependency graph and returns a tuple with two arrays. The first
   * array is a list of CompilationGroupsSuccess, where each item has a list of
   * compilation groups. The second array is a list of CompilationGroupsFailure,
   * where each item has a list of files that couldn't be compiled, grouped by
   * the reason for the failure.
   */
  internalTask(
    TASK_COMPILE_GET_COMPILATION_GROUPS,
    async (
      {
        dependencyGraph,
        solidityFilesCache,
      }: {
        dependencyGraph: IDependencyGraph;
        solidityFilesCache: SolidityFilesCache;
      },
      { run }
    ): Promise<[CompilationGroupsSuccess[], CompilationGroupsFailure[]]> => {
      const { partition } = await import("lodash");

      const connectedComponents = dependencyGraph.getConnectedComponents();

      log(
        `The dependency graph was dividied in '${connectedComponents.length}' connected components`
      );

      const compilationGroupsResults = await Promise.all(
        connectedComponents.map((graph) =>
          getCompilationGroupsFromConnectedComponent(
            graph,
            (file: ResolvedFile) =>
              run(TASK_COMPILE_GET_COMPILATION_GROUP_FOR_FILE, {
                file,
                dependencyGraph,
                solidityFilesCache,
              })
          )
        )
      );

      return partition(compilationGroupsResults, isCompilationGroupsSuccess);
    }
  );

  /**
   * Receives a list of compilation groups and returns a new list where some of
   * the compilation groups might've been removed.
   *
   * This task can be overriden to change the way the cache is used, or to use
   * a different approach to filtering out compilation groups.
   */
  internalTask(
    TASK_COMPILE_FILTER_COMPILATION_GROUPS,
    async ({
      compilationGroups,
      force,
    }: {
      compilationGroups: ICompilationGroup[];
      force: boolean;
      solidityFilesCache: SolidityFilesCache;
    }): Promise<ICompilationGroup[]> => {
      const modifiedCompilationGroups = force
        ? compilationGroups
        : compilationGroups.filter((group) => group.hasChanged());

      const groupsFilteredOutCount =
        modifiedCompilationGroups.length - compilationGroups.length;
      log(`'${groupsFilteredOutCount}' groups were filtered out`);

      return modifiedCompilationGroups;
    }
  );

  /**
   * Receives a list of compilation groups and returns a new list where some of
   * the groups might've been merged.
   */
  internalTask(
    TASK_COMPILE_MERGE_COMPILATION_GROUPS,
    async ({
      compilationGroups,
    }: {
      compilationGroups: ICompilationGroup[];
    }): Promise<ICompilationGroup[]> => {
      return mergeCompilationGroupsWithoutBug(compilationGroups);
    }
  );

  /**
   * Prints a message when there's nothing to compile.
   */
  internalTask(TASK_COMPILE_LOG_NOTHING_TO_COMPILE, async () => {
    console.log("Nothing to compile");
  });

  /**
   * Receives a list of compilation groups and sends each one to be compiled.
   */
  internalTask(
    TASK_COMPILE_COMPILE_GROUPS,
    async (
      {
        compilationGroups,
        solidityFilesCache,
      }: {
        compilationGroups: ICompilationGroup[];
        solidityFilesCache: SolidityFilesCache;
      },
      { run }
    ) => {
      if (compilationGroups.length === 0) {
        log(`No compilation groups to compile`);
        await run(TASK_COMPILE_LOG_NOTHING_TO_COMPILE);
        return;
      }

      for (const compilationGroup of compilationGroups) {
        await run(TASK_COMPILE_COMPILE_GROUP, {
          compilationGroup,
          solidityFilesCache,
        });
      }
    }
  );

  /**
   * Receives a compilation group and returns a SolcInput.
   *
   * It's not recommended to override this task to modify the solc
   * configuration, override TASK_COMPILE_GET_COMPILATION_GROUP_FOR_FILE
   * instead.
   */
  internalTask(
    TASK_COMPILE_GET_COMPILER_INPUT,
    async ({
      compilationGroup,
    }: {
      compilationGroup: ICompilationGroup;
    }): Promise<SolcInput> => {
      return getInputFromCompilationGroup(compilationGroup);
    }
  );

  /**
   * Receives a SolcInput and a solc version, compiles the input using solcjs,
   * and returns the generated output.
   *
   * This task can be overriden to change how solcjs is obtained or used.
   */
  internalTask(
    TASK_COMPILE_COMPILE_SOLCJS,
    async (
      { input, solcVersion }: { input: SolcInput; solcVersion: string },
      { config }
    ) => {
      const compiler = new Compiler(
        solcVersion,
        path.join(config.paths.cache, "compilers")
      );

      const output = await compiler.compile(input);

      return output;
    }
  );

  /**
   * This task is just a proxy to the task that compiles solcjs.
   *
   * Override this to use a different task to compile a group.
   */
  internalTask(TASK_COMPILE_COMPILE, async (taskArgs: any, { run }) => {
    return run(TASK_COMPILE_COMPILE_SOLCJS, taskArgs);
  });

  /**
   * Receives a list of compilation errors and prints them and any other
   * information useful to the user.
   */
  internalTask(
    TASK_COMPILE_LOG_COMPILATION_ERRORS,
    async ({
      compilationErrors,
    }: {
      compilationErrors: CompilationError[];
    }) => {
      for (const { error, severity } of compilationErrors) {
        if (severity === "error") {
          console.error(chalk.red(error.formattedMessage));
        } else {
          console.warn(chalk.yellow(error.formattedMessage));
        }
      }

      const hasConsoleErrors = compilationErrors.some((x) => x.isConsole);
      if (hasConsoleErrors) {
        console.error(
          chalk.red(
            `The console.log call you made isn’t supported. See https://buidler.dev/console-log for the list of supported methods.`
          )
        );
        console.log();
      }
    }
  );

  /**
   * Receives a solc output and checks if there are errors. Throws if there are
   * errors.
   *
   * Override this task to avoid interrupting the compilation process if some
   * group has compilation errors.
   */
  internalTask(
    TASK_COMPILE_CHECK_ERRORS,
    async ({ output }: { output: any }, { run }) => {
      const compilationErrors: CompilationError[] = [];
      if (output.errors) {
        for (const error of output.errors) {
          if (error.severity === "error") {
            if (isConsoleLogError(error)) {
              compilationErrors.push({
                error,
                severity: "error",
                isConsole: true,
              });
            } else {
              compilationErrors.push({
                error,
                severity: "error",
                isConsole: false,
              });
            }
          } else {
            compilationErrors.push({
              error,
              severity: "warning",
              isConsole: false,
            });
          }
        }
      }

      await run(TASK_COMPILE_LOG_COMPILATION_ERRORS, {
        compilationErrors,
      });

      const hasErrors = compilationErrors.some((x) => x.severity === "error");

      if (hasErrors || !output.contracts) {
        log(
          `Compilation failure. hasErrors='${hasErrors}' output.contracts='${!!output.contracts}'`
        );
        throw new BuidlerError(ERRORS.BUILTIN_TASKS.COMPILE_FAILURE);
      }
    }
  );

  /**
   * Saves to disk the artifacts for a compilation group. These artifacts
   * include the main artifacts, the dbg files, and the build info.
   */
  internalTask(
    TASK_COMPILE_EMIT_ARTIFACTS,
    async (
      {
        compilationGroup,
        input,
        output,
        solidityFilesCache,
      }: {
        compilationGroup: ICompilationGroup;
        input: SolcInput;
        output: any;
        solidityFilesCache?: SolidityFilesCache;
      },
      { config, run }
    ): Promise<{ numberOfContracts: number }> => {
      const artifacts = new Artifacts(config.paths.artifacts);

      const pathToBuildInfo = await artifacts.saveBuildInfo(
        input,
        output,
        compilationGroup.getVersion()
      );
      let numberOfContracts = 0;

      for (const file of compilationGroup.getResolvedFiles()) {
        log(`Emitting artifacts for file '${file.globalName}'`);
        if (!compilationGroup.emitsArtifacts(file)) {
          continue;
        }

        const emittedArtifacts = [];
        for (const [contractName, contractOutput] of Object.entries(
          output.contracts?.[file.globalName] ?? {}
        )) {
          log(`Emitting artifact for contract '${contractName}'`);
          numberOfContracts += 1;

          const artifact = await run(
            TASK_COMPILE_GET_ARTIFACT_FROM_COMPILATION_OUTPUT,
            {
              contractName,
              contractOutput,
            }
          );

          await artifacts.saveArtifactFiles(
            file.globalName,
            artifact,
            pathToBuildInfo
          );

          emittedArtifacts.push(artifact.contractName);
        }

        if (solidityFilesCache !== undefined) {
          solidityFilesCache[file.absolutePath] = {
            lastModificationDate: file.lastModificationDate.valueOf(),
            globalName: file.globalName,
            solcConfig: compilationGroup.getSolcConfig(),
            imports: file.content.imports,
            versionPragmas: file.content.versionPragmas,
            artifacts: emittedArtifacts,
          };
        }
      }

      return { numberOfContracts };
    }
  );

  /**
   * Generates the artifact for contract `contractName` given its compilation
   * output.
   */
  internalTask(
    TASK_COMPILE_GET_ARTIFACT_FROM_COMPILATION_OUTPUT,
    async ({
      contractName,
      contractOutput,
    }: {
      contractName: string;
      contractOutput: any;
    }): Promise<any> => {
      return getArtifactFromContractOutput(contractName, contractOutput);
    }
  );

  /**
   * Prints a message before starting the compilation of a group.
   */
  internalTask(
    TASK_COMPILE_LOG_COMPILE_GROUP_START,
    async ({ compilationGroup }: { compilationGroup: ICompilationGroup }) => {
      console.log(`Compiling with ${compilationGroup.getVersion()}`);
    }
  );

  /**
   * Prints a message after compiling a group.
   */
  internalTask(
    TASK_COMPILE_LOG_COMPILE_GROUP_END,
    async ({
      numberOfContracts,
    }: {
      compilationGroup: ICompilationGroup;
      numberOfContracts: number;
    }) => {
      console.log(
        "Compiled",
        numberOfContracts,
        pluralize(numberOfContracts, "contract"),
        "successfully"
      );
    }
  );

  /**
   * This is an orchestrator task that uses other internal tasks to compile a
   * compilation group.
   */
  internalTask(
    TASK_COMPILE_COMPILE_GROUP,
    async (
      {
        compilationGroup,
        solidityFilesCache,
      }: {
        compilationGroup: ICompilationGroup;
        solidityFilesCache?: SolidityFilesCache;
      },
      { run }
    ) => {
      log(`Compiling group with version '${compilationGroup.getVersion()}'`);
      await run(TASK_COMPILE_LOG_COMPILE_GROUP_START, { compilationGroup });

      const input: SolcInput = await run(TASK_COMPILE_GET_COMPILER_INPUT, {
        compilationGroup,
      });

      const output = await run(TASK_COMPILE_COMPILE, {
        solcVersion: compilationGroup.getVersion(),
        input,
      });

      await run(TASK_COMPILE_CHECK_ERRORS, { output });

      if (output === undefined) {
        log(`No output for compilation group`);
        return;
      }

      const { numberOfContracts } = await run(TASK_COMPILE_EMIT_ARTIFACTS, {
        compilationGroup,
        input,
        output,
        solidityFilesCache,
      });

      await run(TASK_COMPILE_LOG_COMPILE_GROUP_END, {
        compilationGroup,
        numberOfContracts,
      });
    }
  );

  /**
   * Receives a list of CompilationGroupsFailure and throws an error if it's not
   * empty.
   *
   * This task could be overriden to avoid interrupting the compilation if
   * there's some part of the project that can't be compiled.
   */
  internalTask(
    TASK_COMPILE_HANDLE_COMPILATION_GROUPS_FAILURES,
    async (
      {
        compilationGroupsFailures,
      }: {
        compilationGroupsFailures: CompilationGroupsFailure[];
      },
      { run }
    ) => {
      if (compilationGroupsFailures.length > 0) {
        log(
          `There are '${compilationGroupsFailures.length}' compilation groups failures, throwing`
        );
        const errorMessage: string = await run(
          TASK_COMPILE_GET_COMPILATION_GROUPS_FAILURES_MESSAGE,
          { compilationGroupsFailures }
        );

        // TODO-HH throw a BuidlerError and show a better error message
        // tslint:disable only-buidler-error
        throw new Error(errorMessage);
      }
    }
  );

  /**
   * Receives a list of CompilationGroupsFailure and returns an error message
   * that describes the failure.
   */
  internalTask(
    TASK_COMPILE_GET_COMPILATION_GROUPS_FAILURES_MESSAGE,
    async ({
      compilationGroupsFailures,
    }: {
      compilationGroupsFailures: CompilationGroupsFailure[];
    }): Promise<string> => {
      const { flatMap } = await import("lodash");
      const nonCompilableOverriden = flatMap(
        compilationGroupsFailures,
        (x) => x.nonCompilableOverriden
      );
      const nonCompilable = flatMap(
        compilationGroupsFailures,
        (x) => x.nonCompilable
      );
      const importsIncompatibleFile = flatMap(
        compilationGroupsFailures,
        (x) => x.importsIncompatibleFile
      );
      const other = flatMap(compilationGroupsFailures, (x) => x.other);

      let errorMessage =
        "The project couldn't be compiled, see reasons below.\n\n";
      if (nonCompilableOverriden.length > 0) {
        errorMessage += `These files have overriden compilations that are incompatible with their version pragmas:

${nonCompilableOverriden.map((x) => `* ${x}`).join("\n")}

`;
      }
      if (nonCompilable.length > 0) {
        errorMessage += `These files don't match any compiler in your config:

${nonCompilable.map((x) => `* ${x}`).join("\n")}

`;
      }
      if (importsIncompatibleFile.length > 0) {
        errorMessage += `These files have imports with incompatible pragmas:

${importsIncompatibleFile.map((x) => `* ${x}`).join("\n")}

`;
      }
      if (other.length > 0) {
        errorMessage += `These files and its dependencies cannot be compiled with your config:

${other.map((x) => `* ${x}`).join("\n")}

`;
      }

      return errorMessage;
    }
  );

  /**
   * Main task for compiling the solidity files in the project.
   *
   * The main responsibility of this task is to orchestrate and connect most of
   * the internal tasks related to compiling solidity.
   */
  internalTask(
    TASK_COMPILE_SOLIDITY,
    async ({ force: force }: { force: boolean }, { config, run }) => {
      const { flatten } = await import("lodash");
      const { readSolidityFilesCache, writeSolidityFilesCache } = await import(
        "./utils/solidity-files-cache"
      );

      const sourcePaths: string[] = await run(TASK_COMPILE_GET_SOURCE_PATHS);

      const sourceNames: string[] = await run(TASK_COMPILE_GET_SOURCE_NAMES, {
        sourcePaths,
      });

      let solidityFilesCache = await readSolidityFilesCache(config.paths);

      const dependencyGraph: IDependencyGraph = await run(
        TASK_COMPILE_GET_DEPENDENCY_GRAPH,
        { sourceNames, solidityFilesCache }
      );

      solidityFilesCache = invalidateCacheMissingArtifacts(
        solidityFilesCache,
        config.paths.artifacts,
        dependencyGraph.getResolvedFiles()
      );

      const [compilationGroupsSuccesses, compilationGroupsFailures]: [
        CompilationGroupsSuccess[],
        CompilationGroupsFailure[]
      ] = await run(TASK_COMPILE_GET_COMPILATION_GROUPS, {
        dependencyGraph,
        solidityFilesCache,
      });

      await run(TASK_COMPILE_HANDLE_COMPILATION_GROUPS_FAILURES, {
        compilationGroupsFailures,
      });

      const compilationGroups = flatten(
        compilationGroupsSuccesses.map((x) => x.groups)
      );

      const filteredCompilationGroups: ICompilationGroup[] = await run(
        TASK_COMPILE_FILTER_COMPILATION_GROUPS,
        { compilationGroups, force, solidityFilesCache }
      );

      const mergedCompilationGroups: ICompilationGroup[] = await run(
        TASK_COMPILE_MERGE_COMPILATION_GROUPS,
        { compilationGroups: filteredCompilationGroups }
      );

      await run(TASK_COMPILE_COMPILE_GROUPS, {
        compilationGroups: mergedCompilationGroups,
        solidityFilesCache,
      });

      const artifacts = new Artifacts(config.paths.artifacts);
      await artifacts.removeObsoleteArtifacts(solidityFilesCache);
      await artifacts.removeObsoleteBuildInfos();

      writeSolidityFilesCache(config.paths, solidityFilesCache);
    }
  );

  /**
   * Returns a list of compilation tasks.
   *
   * This is the task to override to add support for other languages.
   */
  internalTask(
    TASK_COMPILE_GET_COMPILATION_TASKS,
    async (): Promise<string[]> => {
      return [TASK_COMPILE_SOLIDITY];
    }
  );

  /**
   * Main compile task.
   *
   * This is a meta-task that just gets all the compilation tasks and runs them.
   * Right now there's only a "compile solidity" task.
   */
  task(TASK_COMPILE, "Compiles the entire project, building all artifacts")
    .addFlag("force", "Force compilation ignoring cache")
    .setAction(async (compilationArgs: any, { run }) => {
      const compilationTasks: string[] = await run(
        TASK_COMPILE_GET_COMPILATION_TASKS
      );

      for (const compilationTask of compilationTasks) {
        await run(compilationTask, compilationArgs);
      }
    });
}

/**
 * If a file is present in the cache, but some of its artifacts is missing on
 * disk, we remove it from the cache to force it to be recompiled.
 */
function invalidateCacheMissingArtifacts(
  solidityFilesCache: SolidityFilesCache,
  artifactsPath: string,
  resolvedFiles: ResolvedFile[]
): SolidityFilesCache {
  resolvedFiles.forEach((file) => {
    const artifacts = new Artifacts(artifactsPath);

    if (solidityFilesCache[file.absolutePath] === undefined) {
      return;
    }

    const { artifacts: emittedArtifacts } = solidityFilesCache[
      file.absolutePath
    ];

    for (const emittedArtifact of emittedArtifacts) {
      if (!artifacts.artifactExistsSync(file.globalName, emittedArtifact)) {
        log(
          `Invalidate cache for '${file.absolutePath}' because artifact '${emittedArtifact}' doesn't exist`
        );
        delete solidityFilesCache[file.absolutePath];
        break;
      }
    }
  });

  return solidityFilesCache;
}
