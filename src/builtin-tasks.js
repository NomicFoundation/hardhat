const fs = require("fs-extra");
const path = require("path");
const util = require("util");
const Mocha = require("mocha");
const glob = util.promisify(require("glob"));
const rimraf = util.promisify(require("rimraf"));

const { task, internalTask, run, getPublicTasks } = require("./tasks");
const DependencyGraph = require("./DependencyGraph");
const { Resolver } = require("./resolver");
const Compiler = require("./Compiler");
const { buildArtifacts } = require("./artifacts");

internalTask("builtin:get-file-paths", async () => {
  return glob(path.join(config.root, "*", "**.sol"));
});

internalTask("builtin:get-resolved-files", async () => {
  const resolver = new Resolver(config);
  const paths = await run("builtin:get-file-paths");
  return paths.map(p => resolver.resolveProjectSourceFile(p));
});

internalTask("builtin:get-dependency-graph", async () => {
  const resolver = new Resolver(config);
  const localFiles = await run("builtin:get-resolved-files");
  return DependencyGraph.createFromMultipleEntryPoints(resolver, localFiles);
});

internalTask("builtin:get-compiler-input", async () => {
  const compiler = new Compiler(config.solc.version);

  const dependencyGraph = await run("builtin:get-dependency-graph");
  return compiler.getInputFromDependencyGraph(dependencyGraph);
});

internalTask("builtin:compile", async () => {
  const compiler = new Compiler(config.solc.version);
  const input = await run("builtin:get-compiler-input");

  console.log("Compiling...");

  return compiler.compile(input);
});

internalTask("builtin:build-artifacts", async () => {
  const compilationOutput = await run("builtin:compile");

  await buildArtifacts(compilationOutput);
});

internalTask("builtin:get-test-files", async (...commandLineFiles) => {

  if (commandLineFiles.length === 0) {
    return glob(path.join(config.root, "test", "**.js"));
  }

  return commandLineFiles;
});

internalTask("builtin:setup-test-environment", async () => {
  global.accounts = await web3.eth.getAccounts();
  global.assert = require("chai").assert;
});

internalTask("builtin:run-mocha-tests", async (...testFiles) => {
  const mocha = new Mocha();
  testFiles.forEach(file => mocha.addFile(file));

  mocha.run(failures => {
    process.on("exit", function() {
      process.exit(failures);
    });
  });
});

task("help", "Prints this message", async () => {
  console.log(`Usage: npx sool [task]
  
Available tasks:
`);

  const nameLength = getPublicTasks()
    .map(t => t.name.length)
    .reduce((a, b) => Math.max(a, b), 0);

  for (const t of getPublicTasks().sort((a, b) => b.name < a.name)) {
    const description = t.description ? t.description : "";
    console.log(`  ${t.name.padEnd(nameLength)}\t${description}`);
  }
});

task(
  "compile",
  "Compiles the whole project, building all artifacts",
  async () => {
    await run("builtin:build-artifacts");
  }
);

task("clean", "Clears the cache and deletes all artifacts", async () => {
  await rimraf(path.join(config.root, "artifacts"));
  await rimraf(path.join(config.root, "cache"));
});

task("run", "Runs an user-defined script", async scriptPath => {
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script ${scriptPath} doesn't exist.`);
  }

  await run("compile");
  require(fs.realpathSync(scriptPath));
});

task("test", "Runs mocha tests", async (...commandLineFiles) => {
  await run("compile");

  const files = await run("builtin:get-test-files", ...commandLineFiles);
  await run("builtin:setup-test-environment");
  await run("builtin:run-mocha-tests", ...files);
});
