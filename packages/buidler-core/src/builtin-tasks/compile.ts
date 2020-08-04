import chalk from "chalk";
import fsExtra from "fs-extra";
import { cloneDeep } from "lodash";
import path from "path";

import {
  getArtifactFromContractOutput,
  saveArtifact,
} from "../internal/artifacts";
import {
  SOLC_INPUT_FILENAME,
  SOLC_OUTPUT_FILENAME,
} from "../internal/constants";
import { task } from "../internal/core/config/config-env";
import { BuidlerError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import { createCompilationGroups } from "../internal/solidity/compilationGroup";
import { Compiler } from "../internal/solidity/compiler";
import { getInputFromCompilationGroup } from "../internal/solidity/compiler/compiler-input";
import { DependencyGraph } from "../internal/solidity/dependencyGraph";
import { Resolver } from "../internal/solidity/resolver";
import { glob } from "../internal/util/glob";
import { pluralize } from "../internal/util/strings";
import {
  MultiSolcConfig,
  ResolvedBuidlerConfig,
  SolidityConfig,
} from "../types";

import { TASK_COMPILE } from "./task-names";
import { cacheBuidlerConfig } from "./utils/cache";
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

async function cacheSolcJsonFiles(
  config: ResolvedBuidlerConfig,
  input: any,
  output: any
) {
  await fsExtra.ensureDir(config.paths.cache);

  // TODO: This could be much better. It feels somewhat hardcoded
  await fsExtra.writeFile(
    path.join(config.paths.cache, SOLC_INPUT_FILENAME),
    JSON.stringify(input, undefined, 2),
    {
      encoding: "utf8",
    }
  );

  await fsExtra.writeFile(
    path.join(config.paths.cache, SOLC_OUTPUT_FILENAME),
    JSON.stringify(output, undefined, 2),
    {
      encoding: "utf8",
    }
  );
}

function normalizeSolidityConfig(
  solidityConfig: SolidityConfig
): MultiSolcConfig {
  if (typeof solidityConfig === "string") {
    return {
      compilers: [
        {
          version: solidityConfig,
          optimizer: { enabled: false, runs: 200 },
        },
      ],
    };
  }

  if ("version" in solidityConfig) {
    return { compilers: [solidityConfig] };
  }

  return solidityConfig;
}

export default function () {
  task(TASK_COMPILE, "Compiles the entire project, building all artifacts")
    .addFlag("force", "Force compilation ignoring cache")
    .setAction(async (_, { config }) => {
      const resolver = new Resolver(config.paths.root);
      const paths = await glob(path.join(config.paths.sources, "**/*.sol"));
      const resolvedFiles = await Promise.all(
        paths.map((p: string) => resolver.resolveProjectSourceFile(p))
      );
      const dependencyGraph = await DependencyGraph.createFromResolvedFiles(
        resolver,
        resolvedFiles
      );

      const solidityFilesCache = readSolidityFilesCache(config.paths);

      const normalizedSolidityConfig = normalizeSolidityConfig(config.solidity);

      const compilationGroupsResult = createCompilationGroups(
        dependencyGraph,
        normalizedSolidityConfig,
        solidityFilesCache
      );

      if (compilationGroupsResult.isLeft()) {
        const nonCompilableFiles = compilationGroupsResult.value
          .map((x) => x.absolutePath)
          .join(", ");
        throw new Error(
          `Some files didn't match any compiler: ${nonCompilableFiles}`
        );
      }

      const compilationGroups = compilationGroupsResult.value;
      const newSolidityFilesCache = cloneDeep(solidityFilesCache);

      for (const compilationGroup of compilationGroups) {
        if (compilationGroup.isEmpty()) {
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

        await cacheSolcJsonFiles(config, input, output);

        await cacheBuidlerConfig(config.paths, compilationGroup.solidityConfig);

        if (output === undefined) {
          return;
        }

        await fsExtra.ensureDir(config.paths.artifacts);
        let numberOfContracts = 0;

        for (const file of compilationGroup.getResolvedFiles()) {
          if (!compilationGroup.emitsArtifacts(file)) {
            continue;
          }

          for (const [contractName, contractOutput] of Object.entries(
            output.contracts[file.globalName]
          )) {
            const artifact = getArtifactFromContractOutput(
              contractName,
              contractOutput
            );
            numberOfContracts += 1;

            await saveArtifact(config.paths.artifacts, artifact);
          }

          newSolidityFilesCache[file.absolutePath] = {
            lastModificationDate: file.lastModificationDate.valueOf(),
            solcConfig: compilationGroup.solidityConfig,
          };
        }

        console.log(
          "Compiled",
          numberOfContracts,
          pluralize(numberOfContracts, "contract"),
          "successfully"
        );
      }

      writeSolidityFilesCache(config.paths, newSolidityFilesCache);
    });
}
