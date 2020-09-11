import chalk from "chalk";
import fsExtra from "fs-extra";
import path from "path";

import {
  getArtifactFromContractOutput,
  saveArtifact,
} from "../internal/artifacts";
import {
  SOLC_INPUT_FILENAME,
  SOLC_OUTPUT_FILENAME,
} from "../internal/constants";
import { internalTask, task, types } from "../internal/core/config/config-env";
import { BuidlerError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import { Compiler } from "../internal/solidity/compiler";
import { getInputFromDependencyGraph } from "../internal/solidity/compiler/compiler-input";
import { DependencyGraph } from "../internal/solidity/dependencyGraph";
import { Resolver } from "../internal/solidity/resolver";
import { glob } from "../internal/util/glob";
import { getCompilersDir } from "../internal/util/global-dir";
import { pluralize } from "../internal/util/strings";
import { ResolvedBuidlerConfig, SolcInput } from "../types";

import {
  TASK_BUILD_ARTIFACTS,
  TASK_COMPILE,
  TASK_COMPILE_CHECK_CACHE,
  TASK_COMPILE_COMPILE,
  TASK_COMPILE_GET_COMPILER_INPUT,
  TASK_COMPILE_GET_DEPENDENCY_GRAPH,
  TASK_COMPILE_GET_RESOLVED_SOURCES,
  TASK_COMPILE_GET_SOURCE_PATHS,
  TASK_COMPILE_RUN_COMPILER,
} from "./task-names";
import { areArtifactsCached, cacheBuidlerConfig } from "./utils/cache";

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

function isConsoleLogError(error: any): boolean {
  return (
    error.type === "TypeError" &&
    typeof error.message === "string" &&
    error.message.includes("log") &&
    error.message.includes("type(library console)")
  );
}

export default function () {
  internalTask(TASK_COMPILE_GET_SOURCE_PATHS, async (_, { config }) => {
    return glob(path.join(config.paths.sources, "**/*.sol"));
  });

  internalTask(
    TASK_COMPILE_GET_RESOLVED_SOURCES,
    async (_, { config, run }) => {
      const resolver = new Resolver(config.paths.root);
      const paths = await run(TASK_COMPILE_GET_SOURCE_PATHS);
      return Promise.all(
        paths.map((p: string) => resolver.resolveProjectSourceFile(p))
      );
    }
  );

  internalTask(
    TASK_COMPILE_GET_DEPENDENCY_GRAPH,
    async (_, { config, run }) => {
      const resolver = new Resolver(config.paths.root);
      const localFiles = await run(TASK_COMPILE_GET_RESOLVED_SOURCES);

      return DependencyGraph.createFromResolvedFiles(resolver, localFiles);
    }
  );

  internalTask(TASK_COMPILE_GET_COMPILER_INPUT, async (_, { config, run }) => {
    const dependencyGraph: DependencyGraph = await run(
      TASK_COMPILE_GET_DEPENDENCY_GRAPH
    );

    return getInputFromDependencyGraph(
      dependencyGraph,
      config.solc.optimizer,
      config.solc.evmVersion
    );
  });

  internalTask(TASK_COMPILE_RUN_COMPILER)
    .addParam(
      "input",
      "The compiler standard JSON input",
      undefined,
      types.json
    )
    .setAction(async ({ input }: { input: SolcInput }, { config }) => {
      const compilersCache = await getCompilersDir();
      const compiler = new Compiler(config.solc.version, compilersCache);

      return compiler.compile(input);
    });

  internalTask(TASK_COMPILE_COMPILE, async (_, { config, run }) => {
    const input = await run(TASK_COMPILE_GET_COMPILER_INPUT);

    console.log("Compiling...");
    const output = await run(TASK_COMPILE_RUN_COMPILER, { input });

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

    await cacheBuidlerConfig(config.paths, config.solc);

    return output;
  });

  internalTask(TASK_COMPILE_CHECK_CACHE, async ({ force }, { config, run }) => {
    if (force) {
      return false;
    }

    const dependencyGraph: DependencyGraph = await run(
      TASK_COMPILE_GET_DEPENDENCY_GRAPH
    );

    const sourceTimestamps = dependencyGraph
      .getResolvedFiles()
      .map((file) => file.lastModificationDate.getTime());

    return areArtifactsCached(sourceTimestamps, config.solc, config.paths);
  });

  internalTask(TASK_BUILD_ARTIFACTS, async ({ force }, { config, run }) => {
    const sources = await run(TASK_COMPILE_GET_SOURCE_PATHS);

    if (sources.length === 0) {
      console.log("No Solidity source file available.");
      return;
    }

    const isCached: boolean = await run(TASK_COMPILE_CHECK_CACHE, { force });

    if (isCached) {
      console.log(
        "All contracts have already been compiled, skipping compilation."
      );
      return;
    }

    const compilationOutput = await run(TASK_COMPILE_COMPILE);

    if (compilationOutput === undefined) {
      return;
    }

    await fsExtra.ensureDir(config.paths.artifacts);
    let numberOfContracts = 0;

    for (const file of Object.values<any>(compilationOutput.contracts)) {
      for (const [contractName, contractOutput] of Object.entries(file)) {
        const artifact = getArtifactFromContractOutput(
          contractName,
          contractOutput
        );
        numberOfContracts += 1;

        await saveArtifact(config.paths.artifacts, artifact);
      }
    }

    console.log(
      "Compiled",
      numberOfContracts,
      pluralize(numberOfContracts, "contract"),
      "successfully"
    );
  });

  task(TASK_COMPILE, "Compiles the entire project, building all artifacts")
    .addFlag("force", "Force compilation ignoring cache")
    .setAction(async ({ force: force }: { force: boolean }, { run }) =>
      run(TASK_BUILD_ARTIFACTS, { force })
    );
}
