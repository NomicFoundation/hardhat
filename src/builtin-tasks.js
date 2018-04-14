const fs = require("fs-extra");
const path = require("path");
const util = require("util");
const glob = util.promisify(require("glob"));
const rimraf = util.promisify(require("rimraf"));

const DependencyGraph = require("./DependencyGraph");
const {Resolver} = require("./resolver");
const Compiler = require("./Compiler");

task("builtin:get-file-paths", async () => {
  return glob(path.join(config.root, "*", "**.sol"));
});

task("builtin:get-resolved-files", async () => {
  const resolver = new Resolver(config);
  const paths = await run("builtin:get-file-paths");
  return paths.map(p => resolver.resolveProjectSourceFile(p));
});

task("builtin:get-dependency-graph", async () => {
  const resolver = new Resolver(config);
  const localFiles = await run("builtin:get-resolved-files");
  return DependencyGraph.createFromMultipleEntryPoints(resolver, localFiles);
});

task("builtin:get-compiler-input", async () => {
  const compiler = new Compiler(config.solc.version);

  const dependencyGraph = await run("builtin:get-dependency-graph");
  return compiler.getInputFromDependencyGraph(dependencyGraph);
});

task("builtin:compile", async () => {
  const compiler = new Compiler(config.solc.version);
  const input = await run("builtin:get-compiler-input");

  console.log("Compiling...");

  return compiler.compile(input);
});

task("builtin:build-artifacts", async () => {
  const compilationOutput = await run("builtin:compile");

  const artifactsPath = path.join(config.root, "artifacts");

  await fs.ensureDir(path.join(artifactsPath, "abi"));
  await fs.ensureDir(path.join(artifactsPath, "bytecode"));

  for (const [globalFileName, fileContracts] of Object.entries(
    compilationOutput.contracts
  )) {
    for (const [contractName, contract] of Object.entries(fileContracts)) {
      // If we want to support multiple contracts with the same name we need to somehow respect their FS hierarchy,
      // but solidity doesn't have a 1-to-1 relationship between contracts and files. Then, using the globalFileName as
      // name here would be wrong. But we can use it's dirname at least.
      const outputPath = path.join(path.dirname(globalFileName), contractName);

      await fs.outputJSON(
        "artifacts/abi/" + outputPath + ".json",
        contract.abi,
        { spaces: 2 }
      );

      if (contract.evm && contract.evm.bytecode) {
        await fs.outputJSON(
          "artifacts/bytecode/" + outputPath + ".json",
          contract.evm.bytecode,
          { spaces: 2 }
        );
      }
    }
  }
});

task("compile", async () => {
  await run("builtin:build-artifacts");
});

task("clean", async () => {
  await rimraf(path.join(config.root, "artifacts"));
  await rimraf(path.join(config.root, "cache"));
});

task("run", async scriptPath => {
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script ${scriptPath} doesn't exist.`);
  }

  await run("compile");

  const env = require("./env");

  for (const key of Object.keys(env)) {
    global[key] = env[key];
  }

  require(fs.realpathSync(scriptPath));
});
