const importLazy = require("import-lazy")(require);
const path = require("path");
const util = require("util");
const glob = util.promisify(require("glob"));
const chalk = importLazy("chalk");

const DependencyGraph = require("../solidity/dependencyGraph");
const { Resolver } = require("../solidity/resolver");
const Compiler = require("../solidity/compiler");
const { TruffleArtifactsStorage } = require("../core/truffle");
const { areArtifactsCached } = require("./utils/cache");

function getCompilersDir(config) {
  return path.join(config.paths.cache, "compilers");
}

function getCompiler(config) {
  return new Compiler(
    config.solc.version,
    getCompilersDir(config),
    config.solc.optimizer
  );
}

internalTask("builtin:get-file-paths", async () => {
  return glob(path.join(config.paths.sources, "**/*.sol"));
});

internalTask("builtin:get-resolved-files", async () => {
  const resolver = new Resolver(config);
  const paths = await run("builtin:get-file-paths");
  return Promise.all(paths.map(p => resolver.resolveProjectSourceFile(p)));
});

internalTask("builtin:get-dependency-graph", async () => {
  const resolver = new Resolver(config);
  const localFiles = await run("builtin:get-resolved-files");
  return DependencyGraph.createFromResolvedFiles(resolver, localFiles);
});

internalTask("builtin:get-compiler-input", async () => {
  const compiler = getCompiler(config);
  const dependencyGraph = await run("builtin:get-dependency-graph");
  return compiler.getInputFromDependencyGraph(dependencyGraph);
});

internalTask("builtin:compile", async () => {
  const compiler = getCompiler(config);
  const input = await run("builtin:get-compiler-input");

  console.log("Compiling...");
  const output = await compiler.compile(input);

  let hasErrors = false;
  if (output.errors) {
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
    throw new Error("Compilation failed");
  }

  return output;
});

internalTask("builtin:build-artifacts", async () => {
  if (await areArtifactsCached(config.paths.sources, config.paths.artifacts)) {
    return;
  }

  const compilationOutput = await run("builtin:compile");

  if (compilationOutput === undefined) {
    return;
  }

  const truffleArtifactsStorage = new TruffleArtifactsStorage(
    config.paths.artifacts
  );

  await truffleArtifactsStorage.saveTruffleArtifacts(compilationOutput);
});

task(
  "compile",
  "Compiles the whole project, building all artifacts",
  async () => run("builtin:build-artifacts")
);
