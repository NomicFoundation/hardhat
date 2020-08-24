import chalk from "chalk";
import fsExtra from "fs-extra";
import { cloneDeep, flatMap } from "lodash";
import path from "path";

import {
  getAllArtifacts,
  getArtifactFromContractOutput,
  getArtifactPathSync,
  getBuildInfoFiles,
  saveArtifact,
  saveBuildInfo,
} from "../internal/artifacts";
import { task } from "../internal/core/config/config-env";
import { BuidlerError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import {
  CompilationGroup,
  CompilationGroupsFailure,
  createCompilationGroups,
  isCompilationGroupsFailure,
} from "../internal/solidity/compilationGroup";
import { Compiler } from "../internal/solidity/compiler";
import { getInputFromCompilationGroup } from "../internal/solidity/compiler/compiler-input";
import { DependencyGraph } from "../internal/solidity/dependencyGraph";
import { Parser } from "../internal/solidity/parse";
import { ResolvedFile, Resolver } from "../internal/solidity/resolver";
import { glob } from "../internal/util/glob";
import { pluralize } from "../internal/util/strings";

import { TASK_COMPILE } from "./task-names";
import {
  readSolidityFilesCache,
  SolidityFilesCache,
  writeSolidityFilesCache,
} from "./utils/solidity-files-cache";

function isConsoleLogError(error: any): boolean {
  return (
    error.type === "TypeError" &&
    typeof error.message === "string" &&
    error.message.includes("log") &&
    error.message.includes("type(library console)")
  );
}

export default function () {
  task(TASK_COMPILE, "Compiles the entire project, building all artifacts")
    .addFlag("force", "Force compilation ignoring cache")
    .setAction(async ({ force: force }: { force: boolean }, { config }) => {
      let solidityFilesCache = await readSolidityFilesCache(config.paths);

      const parser = new Parser(solidityFilesCache);
      const resolver = new Resolver(config.paths.root, parser);
      const paths = await glob(path.join(config.paths.sources, "**/*.sol"));
      const resolvedFiles = await Promise.all(
        paths.map((p: string) => resolver.resolveProjectSourceFile(p))
      );

      const dependencyGraph = await DependencyGraph.createFromResolvedFiles(
        resolver,
        resolvedFiles
      );

      const connectedComponents = dependencyGraph.getConnectedComponents();

      solidityFilesCache = invalidateCacheMissingArtifacts(
        solidityFilesCache,
        config.paths.artifacts,
        dependencyGraph.getResolvedFiles()
      );

      let compilationGroups: CompilationGroup[] = [];
      const compilationFailures: CompilationGroupsFailure[] = [];

      for (const connectedComponent of connectedComponents) {
        const compilationGroupsResult = createCompilationGroups(
          connectedComponent,
          config.solidity,
          solidityFilesCache,
          force
        );

        if (isCompilationGroupsFailure(compilationGroupsResult)) {
          compilationFailures.push(compilationGroupsResult);
        } else {
          compilationGroups = compilationGroups.concat(
            compilationGroupsResult.groups
          );
        }
      }

      if (compilationFailures.length > 0) {
        const errorMessage = buildCompilationGroupsFailureMessage(
          compilationFailures
        );
        // TODO throw a BuidlerError and show a better error message
        // tslint:disable only-buidler-error
        throw new Error(errorMessage);
      }

      const newSolidityFilesCache = cloneDeep(solidityFilesCache);
      for (const compilationGroup of compilationGroups) {
        if (!compilationGroup.emitsArtifacts()) {
          console.log(
            `Nothing to compile with version ${compilationGroup.solidityConfig.version}`
          );
          continue;
        }

        console.log(
          `Compiling with ${compilationGroup.solidityConfig.version}`
        );
        const input = getInputFromCompilationGroup(compilationGroup);
        const compiler = new Compiler(
          compilationGroup.solidityConfig.version,
          path.join(config.paths.cache, "compilers")
        );

        const output = await compiler.compile(input);

        let hasErrors = false;
        let hasConsoleLogErrors = false;
        if (output.errors) {
          for (const error of output.errors) {
            hasErrors = hasErrors || error.severity === "error";
            if (error.severity === "error") {
              hasErrors = true;

              if (isConsoleLogError(error)) {
                hasConsoleLogErrors = true;
              }

              console.error(chalk.red(error.formattedMessage));
            } else {
              console.log("\n");
              console.warn(chalk.yellow(error.formattedMessage));
            }
          }
        }

        if (hasConsoleLogErrors) {
          console.error(
            chalk.red(
              `The console.log call you made isn’t supported. See https://buidler.dev/console-log for the list of supported methods.`
            )
          );
          console.log();
        }

        if (hasErrors || !output.contracts) {
          throw new BuidlerError(ERRORS.BUILTIN_TASKS.COMPILE_FAILURE);
        }

        const pathToBuildInfo = await saveBuildInfo(
          config.paths.artifacts,
          input,
          output
        );

        if (output === undefined) {
          return;
        }

        let numberOfContracts = 0;

        for (const file of compilationGroup.getResolvedFiles()) {
          if (!compilationGroup.emitsArtifacts(file)) {
            continue;
          }

          const emittedArtifacts = [];
          for (const [contractName, contractOutput] of Object.entries(
            output.contracts?.[file.globalName] ?? {}
          )) {
            const artifact = getArtifactFromContractOutput(
              contractName,
              contractOutput
            );
            numberOfContracts += 1;

            await saveArtifact(
              config.paths.artifacts,
              file.globalName,
              artifact,
              pathToBuildInfo
            );

            emittedArtifacts.push(artifact.contractName);
          }

          newSolidityFilesCache[file.absolutePath] = {
            lastModificationDate: file.lastModificationDate.valueOf(),
            globalName: file.globalName,
            solcConfig: compilationGroup.solidityConfig,
            imports: file.content.imports,
            versionPragmas: file.content.versionPragmas,
            artifacts: emittedArtifacts,
          };
        }

        console.log(
          "Compiled",
          numberOfContracts,
          pluralize(numberOfContracts, "contract"),
          "successfully"
        );
      }

      await removeObsoleteArtifacts(
        config.paths.artifacts,
        newSolidityFilesCache
      );

      await removeObsoleteBuildInfos(config.paths.artifacts);

      writeSolidityFilesCache(config.paths, newSolidityFilesCache);
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
      fsExtra.unlinkSync(artifact);
    }
  }
}

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
 * Remove from the given `solidityFilesCache` all files that have missing artifacts
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

function buildCompilationGroupsFailureMessage(
  compilationGroupsFailures: CompilationGroupsFailure[]
): string {
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

  let errorMessage = "The project couldn't be compiled, see reasons below.\n\n";
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
