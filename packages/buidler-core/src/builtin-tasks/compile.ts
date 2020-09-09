import chalk from "chalk";
import fsExtra from "fs-extra";
// TODO-HH: import lodash and other libraries dynamically
import { flatMap, flatten, partition } from "lodash";
import path from "path";

import {
  getAllArtifacts,
  getArtifactFromContractOutput,
  getArtifactPathSync,
  getBuildInfoFiles,
  saveArtifact,
  saveBuildInfo,
} from "../internal/artifacts";
import { internalTask, task } from "../internal/core/config/config-env";
import { BuidlerError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import {
  CompilationGroup,
  CompilationGroupsFailure,
  CompilationGroupsSuccess,
  getCompilationGroupFromFile,
  getCompilationGroupsFromConnectedComponent,
  isCompilationGroupsSuccess,
  mergeCompilationGroupsWithoutBug,
} from "../internal/solidity/compilationGroup";
import { Compiler } from "../internal/solidity/compiler";
import { getInputFromCompilationGroup } from "../internal/solidity/compiler/compiler-input";
import { DependencyGraph } from "../internal/solidity/dependencyGraph";
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
import {
  readSolidityFilesCache,
  SolidityFilesCache,
  writeSolidityFilesCache,
} from "./utils/solidity-files-cache";

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

export default function () {
  // TODO-HH: this is lacking in debug logs
  internalTask(TASK_COMPILE_GET_SOURCE_PATHS, async (_, { config }) => {
    const paths = await glob(path.join(config.paths.sources, "**/*.sol"));

    return paths;
  });

  internalTask(
    TASK_COMPILE_GET_SOURCE_NAMES,
    async ({ sourcePaths }: { sourcePaths: string[] }, { config }) => {
      const sourceNames = await Promise.all(
        sourcePaths.map((p) => localPathToSourceName(config.paths.root, p))
      );

      return sourceNames;
    }
  );

  internalTask(
    TASK_COMPILE_GET_DEPENDENCY_GRAPH,
    async (
      {
        sourceNames,
        solidityFilesCache,
      }: { sourceNames: string[]; solidityFilesCache: SolidityFilesCache },
      { config }
    ) => {
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

  internalTask(
    TASK_COMPILE_GET_COMPILATION_GROUP_FOR_FILE,
    async (
      {
        dependencyGraph,
        file,
      }: { dependencyGraph: DependencyGraph; file: ResolvedFile },
      { config }
    ) => {
      return getCompilationGroupFromFile(
        dependencyGraph,
        file,
        config.solidity
      );
    }
  );

  internalTask(
    TASK_COMPILE_GET_COMPILATION_GROUPS,
    async (
      { dependencyGraph }: { dependencyGraph: DependencyGraph },
      { run }
    ) => {
      const connectedComponents = dependencyGraph.getConnectedComponents();

      const compilationGroupsResults = await Promise.all(
        connectedComponents.map((graph) =>
          getCompilationGroupsFromConnectedComponent(
            graph,
            (file: ResolvedFile) =>
              run(TASK_COMPILE_GET_COMPILATION_GROUP_FOR_FILE, {
                file,
                dependencyGraph,
              })
          )
        )
      );

      return partition(compilationGroupsResults, isCompilationGroupsSuccess);
    }
  );

  internalTask(
    TASK_COMPILE_FILTER_COMPILATION_GROUPS,
    async ({
      compilationGroups,
      force,
      solidityFilesCache,
    }: {
      compilationGroups: CompilationGroup[];
      force: boolean;
      solidityFilesCache: SolidityFilesCache;
    }) => {
      const modifiedCompilationGroups = force
        ? compilationGroups
        : compilationGroups.filter((group) =>
            group.hasChanged(solidityFilesCache)
          );

      const emittingCompilationGroups = modifiedCompilationGroups.filter(
        (group) => group.emitsArtifacts()
      );

      return emittingCompilationGroups;
    }
  );

  internalTask(
    TASK_COMPILE_MERGE_COMPILATION_GROUPS,
    async ({
      compilationGroups,
    }: {
      compilationGroups: CompilationGroup[];
    }) => {
      return mergeCompilationGroupsWithoutBug(compilationGroups);
    }
  );

  internalTask(TASK_COMPILE_LOG_NOTHING_TO_COMPILE, async () => {
    console.log("Nothing to compile");
  });

  internalTask(
    TASK_COMPILE_COMPILE_GROUPS,
    async (
      {
        compilationGroups,
        solidityFilesCache,
        force,
      }: {
        compilationGroups: CompilationGroup[];
        solidityFilesCache: SolidityFilesCache;
        force: boolean;
      },
      { run }
    ) => {
      if (compilationGroups.length === 0) {
        await run(TASK_COMPILE_LOG_NOTHING_TO_COMPILE);
        return;
      }

      for (const compilationGroup of compilationGroups) {
        await run(TASK_COMPILE_COMPILE_GROUP, {
          compilationGroup,
          solidityFilesCache,
          force,
        });
      }
    }
  );

  internalTask(
    TASK_COMPILE_GET_COMPILER_INPUT,
    async ({ compilationGroup }: { compilationGroup: CompilationGroup }) => {
      return getInputFromCompilationGroup(compilationGroup);
    }
  );

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

  internalTask(TASK_COMPILE_COMPILE, async (taskArgs: any, { run }) => {
    return run(TASK_COMPILE_COMPILE_SOLCJS, taskArgs);
  });

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
        throw new BuidlerError(ERRORS.BUILTIN_TASKS.COMPILE_FAILURE);
      }
    }
  );

  internalTask(
    TASK_COMPILE_EMIT_ARTIFACTS,
    async (
      {
        compilationGroup,
        input,
        output,
        solidityFilesCache,
        force,
      }: {
        compilationGroup: CompilationGroup;
        input: SolcInput;
        output: any;
        solidityFilesCache?: SolidityFilesCache;
        force: boolean;
      },
      { config }
    ) => {
      const pathToBuildInfo = await saveBuildInfo(
        config.paths.artifacts,
        input,
        output,
        compilationGroup.getVersion()
      );
      let numberOfContracts = 0;

      for (const file of compilationGroup.getResolvedFiles()) {
        if (!force && !compilationGroup.emitsArtifacts(file)) {
          continue;
        }

        const emittedArtifacts = [];
        for (const [contractName, contractOutput] of Object.entries(
          output.contracts?.[file.globalName] ?? {}
        )) {
          numberOfContracts += 1;

          const artifact = getArtifactFromContractOutput(
            contractName,
            contractOutput
          );

          await saveArtifact(
            config.paths.artifacts,
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
            solcConfig: compilationGroup.solidityConfig,
            imports: file.content.imports,
            versionPragmas: file.content.versionPragmas,
            artifacts: emittedArtifacts,
          };
        }
      }

      return { numberOfContracts };
    }
  );

  internalTask(
    TASK_COMPILE_LOG_COMPILE_GROUP_START,
    async ({ compilationGroup }: { compilationGroup: CompilationGroup }) => {
      console.log(`Compiling with ${compilationGroup.solidityConfig.version}`);
    }
  );

  internalTask(
    TASK_COMPILE_LOG_COMPILE_GROUP_END,
    async ({
      numberOfContracts,
    }: {
      compilationGroup: CompilationGroup;
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

  internalTask(
    TASK_COMPILE_COMPILE_GROUP,
    async (
      {
        compilationGroup,
        solidityFilesCache,
        force,
      }: {
        compilationGroup: CompilationGroup;
        solidityFilesCache?: SolidityFilesCache;
        force: boolean;
      },
      { run }
    ) => {
      await run(TASK_COMPILE_LOG_COMPILE_GROUP_START, { compilationGroup });

      const input: SolcInput = await run(TASK_COMPILE_GET_COMPILER_INPUT, {
        compilationGroup,
      });

      const output = await run(TASK_COMPILE_COMPILE, {
        solcVersion: compilationGroup.solidityConfig.version,
        input,
      });

      await run(TASK_COMPILE_CHECK_ERRORS, { output });

      if (output === undefined) {
        return;
      }

      const { numberOfContracts } = await run(TASK_COMPILE_EMIT_ARTIFACTS, {
        compilationGroup,
        input,
        output,
        solidityFilesCache,
        force,
      });

      await run(TASK_COMPILE_LOG_COMPILE_GROUP_END, {
        compilationGroup,
        numberOfContracts,
      });
    }
  );

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

  internalTask(
    TASK_COMPILE_GET_COMPILATION_GROUPS_FAILURES_MESSAGE,
    async ({
      compilationGroupsFailures,
    }: {
      compilationGroupsFailures: CompilationGroupsFailure[];
    }) => {
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

  internalTask(
    TASK_COMPILE_SOLIDITY,
    async ({ force: force }: { force: boolean }, { config, run }) => {
      const sourcePaths: string[] = await run(TASK_COMPILE_GET_SOURCE_PATHS);

      const sourceNames: string[] = await run(TASK_COMPILE_GET_SOURCE_NAMES, {
        sourcePaths,
      });

      let solidityFilesCache = await readSolidityFilesCache(config.paths);

      const dependencyGraph: DependencyGraph = await run(
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
      ] = await run(TASK_COMPILE_GET_COMPILATION_GROUPS, { dependencyGraph });

      await run(TASK_COMPILE_HANDLE_COMPILATION_GROUPS_FAILURES, {
        compilationGroupsFailures,
      });

      const compilationGroups = flatten(
        compilationGroupsSuccesses.map((x) => x.groups)
      );

      const filteredCompilationGroups: CompilationGroup[] = await run(
        TASK_COMPILE_FILTER_COMPILATION_GROUPS,
        { compilationGroups, force, solidityFilesCache }
      );

      const mergedCompilationGroups: CompilationGroup[] = await run(
        TASK_COMPILE_MERGE_COMPILATION_GROUPS,
        { compilationGroups: filteredCompilationGroups }
      );

      await run(TASK_COMPILE_COMPILE_GROUPS, {
        compilationGroups: mergedCompilationGroups,
        solidityFilesCache,
        force,
      });

      await removeObsoleteArtifacts(config.paths.artifacts, solidityFilesCache);

      await removeObsoleteBuildInfos(config.paths.artifacts);

      writeSolidityFilesCache(config.paths, solidityFilesCache);
    }
  );

  internalTask(TASK_COMPILE_GET_COMPILATION_TASKS, async () => {
    return [TASK_COMPILE_SOLIDITY];
  });

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
 * Remove all artifacts that don't correspond to the current solidity files
 */
async function removeObsoleteArtifacts(
  artifactsPath: string,
  solidityFilesCache: SolidityFilesCache
) {
  const validArtifacts = new Set<string>();
  for (const { globalName, artifacts } of Object.values(solidityFilesCache)) {
    for (const artifact of artifacts) {
      validArtifacts.add(
        getArtifactPathSync(artifactsPath, globalName, artifact)
      );
    }
  }

  const existingArtifacts = await getAllArtifacts(artifactsPath);

  for (const artifact of existingArtifacts) {
    if (!validArtifacts.has(artifact)) {
      // TODO-HH: consider moving all unlinks to a helper library that checks
      // that removed files are inside the project
      fsExtra.unlinkSync(artifact);
      const dbgFile = artifact.replace(/\.json$/, ".dbg");
      // we use remove instead of unlink in case the dbg file doesn't exist
      fsExtra.removeSync(dbgFile);
    }
  }
}

/**
 * Remove all build infos that aren't used by any dbg file
 */
async function removeObsoleteBuildInfos(artifactsPath: string) {
  const dbgFiles = await glob(path.join(artifactsPath, "**/*.dbg"));

  const validBuildInfos = new Set<string>();
  for (const dbgFile of dbgFiles) {
    const { buildInfo } = await fsExtra.readJson(dbgFile);
    validBuildInfos.add(path.resolve(path.dirname(dbgFile), buildInfo));
  }

  const buildInfoFiles = await getBuildInfoFiles(artifactsPath);

  for (const buildInfoFile of buildInfoFiles) {
    if (!validBuildInfos.has(buildInfoFile)) {
      await fsExtra.unlink(buildInfoFile);
    }
  }
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
    if (solidityFilesCache[file.absolutePath] === undefined) {
      return;
    }

    const { artifacts } = solidityFilesCache[file.absolutePath];

    for (const artifact of artifacts) {
      if (
        !fsExtra.existsSync(
          getArtifactPathSync(artifactsPath, file.globalName, artifact)
        )
      ) {
        delete solidityFilesCache[file.absolutePath];
        break;
      }
    }
  });

  return solidityFilesCache;
}
