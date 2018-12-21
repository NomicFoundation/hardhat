import path from "path";

import { internalTask, task } from "../core/config/config-env";
import { BuidlerError, ERRORS } from "../core/errors";
import { Compiler } from "../solidity/compiler";
import { DependencyGraph } from "../solidity/dependencyGraph";
import { Resolver } from "../solidity/resolver";
import { BuidlerConfig } from "../types";
import { glob } from "../util/glob";

import { areArtifactsCached } from "./utils/cache";

function getCompilersDir(config: BuidlerConfig) {
  return path.join(config.paths.cache, "compilers");
}

function getCompiler(config: BuidlerConfig) {
  return new Compiler(
    config.solc.version,
    getCompilersDir(config),
    config.solc.optimizer
  );
}

internalTask("builtin:get-file-paths", async (_, { config }) => {
  return glob(path.join(config.paths.sources, "**/*.sol"));
});

internalTask("builtin:get-resolved-files", async (_, { config, run }) => {
  const resolver = new Resolver(config.paths.root);
  const paths = await run("builtin:get-file-paths");
  return Promise.all(
    paths.map((p: string) => resolver.resolveProjectSourceFile(p))
  );
});

internalTask("builtin:get-dependency-graph", async (_, { config, run }) => {
  const resolver = new Resolver(config.paths.root);
  const localFiles = await run("builtin:get-resolved-files");
  return DependencyGraph.createFromResolvedFiles(resolver, localFiles);
});

internalTask("builtin:get-compiler-input", async (_, { config, run }) => {
  const compiler = getCompiler(config);
  const dependencyGraph = await run("builtin:get-dependency-graph");
  return compiler.getInputFromDependencyGraph(dependencyGraph);
});

internalTask("builtin:compile", async (_, { config, run }) => {
  const compiler = getCompiler(config);
  const input = await run("builtin:get-compiler-input");

  console.log("Compiling...");
  const output = await compiler.compile(input);

  let hasErrors = false;
  if (output.errors) {
    const { default: chalk } = await import("chalk");

    for (const error of output.errors) {
      hasErrors = hasErrors || error.severity === "error";
      if (error.severity === "error") {
        hasErrors = true;
        console.log("\n");
        console.error(chalk.red(error.formattedMessage));
      } else {
        console.log("\n");
        console.warn(chalk.yellow(error.formattedMessage));
      }
    }
  }

  if (hasErrors || !output.contracts) {
    throw new BuidlerError(ERRORS.TASK_COMPILE_FAILURE);
  }

  return output;
});

internalTask("builtin:build-artifacts", async (_, { config, run }) => {
  if (
    await areArtifactsCached(
      config.paths.sources,
      config.paths.artifacts,
      config
    )
  ) {
    return;
  }

  const compilationOutput = await run("builtin:compile");

  if (compilationOutput === undefined) {
    return;
  }

  const fsExtra = await import("fs-extra");
  await fsExtra.ensureDir(config.paths.artifacts);

  for (const file of Object.values(compilationOutput.contracts)) {
    for (const [contractName, contractOutput] of Object.entries(file)) {
      const bytecode =
        contractOutput.evm &&
        contractOutput.evm.bytecode &&
        contractOutput.evm.bytecode.object
          ? contractOutput.evm.bytecode.object
          : undefined;

      const linkReferences =
        contractOutput.evm &&
        contractOutput.evm.bytecode &&
        contractOutput.evm.bytecode.linkReferences
          ? contractOutput.evm.bytecode.linkReferences
          : undefined;

      const artifact: any = {
        abi: contractOutput.abi,
        evm: {
          bytecode: {
            object: bytecode,
            linkReferences
          }
        }
      };

      await fsExtra.writeJSON(
        config.paths.artifacts + "/" + contractName + ".json",
        artifact,
        {
          spaces: 2
        }
      );
    }
  }
});

task(
  "compile",
  "Compiles the whole project, building all artifacts",
  async (__, { run }) => run("builtin:build-artifacts")
);
