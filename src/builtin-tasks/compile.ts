import colors from "ansi-colors";
import path from "path";

import {
  getArtifactFromContractOutput,
  saveArtifact
} from "../internal/artifacts";
import { internalTask, task } from "../internal/core/config/config-env";
import { BuidlerError, ERRORS } from "../internal/core/errors";
import { Compiler } from "../internal/solidity/compiler";
import { DependencyGraph } from "../internal/solidity/dependencyGraph";
import { Resolver } from "../internal/solidity/resolver";
import { glob } from "../internal/util/glob";
import { ResolvedBuidlerConfig } from "../types";

import { areArtifactsCached } from "./utils/cache";

function getCompilersDir(config: ResolvedBuidlerConfig) {
  return path.join(config.paths.cache, "compilers");
}

function getCompiler(config: ResolvedBuidlerConfig) {
  return new Compiler(
    config.solc.version,
    getCompilersDir(config),
    config.solc.optimizer
  );
}

internalTask("compile:get-source-path", async (_, { config }) => {
  return glob(path.join(config.paths.sources, "**/*.sol"));
});

internalTask("compile:get-resolved-files", async (_, { config, run }) => {
  const resolver = new Resolver(config.paths.root);
  const paths = await run("compile:get-source-paths");
  return Promise.all(
    paths.map((p: string) => resolver.resolveProjectSourceFile(p))
  );
});

internalTask("compile:get-dependency-graph", async (_, { config, run }) => {
  const resolver = new Resolver(config.paths.root);
  const localFiles = await run("compile:get-resolved-files");
  return DependencyGraph.createFromResolvedFiles(resolver, localFiles);
});

internalTask("compile:get-compiler-input", async (_, { config, run }) => {
  const compiler = getCompiler(config);
  const dependencyGraph = await run("compile:get-dependency-graph");
  return compiler.getInputFromDependencyGraph(dependencyGraph);
});

internalTask("compile:compile", async (_, { config, run }) => {
  const compiler = getCompiler(config);
  const input = await run("compile:get-compiler-input");

  console.log("Compiling...");
  const output = await compiler.compile(input);

  let hasErrors = false;
  if (output.errors) {
    for (const error of output.errors) {
      hasErrors = hasErrors || error.severity === "error";
      if (error.severity === "error") {
        hasErrors = true;
        console.log("\n");
        console.error(colors.red(error.formattedMessage));
      } else {
        console.log("\n");
        console.warn(colors.yellow(error.formattedMessage));
      }
    }
  }

  if (hasErrors || !output.contracts) {
    throw new BuidlerError(ERRORS.BUILTIN_TASKS.COMPILE_FAILURE);
  }

  return output;
});

internalTask("compile:build-artifacts", async (_, { config, run }) => {
  if (await areArtifactsCached(config.paths)) {
    return;
  }

  const sources = await run("compile:get-sources-path");

  if (sources.length === 0) {
    return;
  }

  const compilationOutput = await run("compile:compile");

  if (compilationOutput === undefined) {
    return;
  }

  const fsExtra = await import("fs-extra");
  await fsExtra.ensureDir(config.paths.artifacts);

  for (const file of Object.values(compilationOutput.contracts)) {
    for (const [contractName, contractOutput] of Object.entries(file)) {
      const artifact = getArtifactFromContractOutput(
        contractName,
        contractOutput
      );

      await saveArtifact(config.paths.artifacts, artifact);
    }
  }
});

task(
  "compile",
  "Compiles the entire project, building all artifacts",
  async (__, { run }) => run("compile:build-artifacts")
);
