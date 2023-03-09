import * as fs from "fs";
import { subtask, task } from "hardhat/config";
import { NomicLabsHardhatPluginError } from "hardhat/internal/core/errors";
import { join, relative } from "path";

function getDefaultConfig() {
  return {
    extends: ["solhint:default"],
  };
}

function getFormatter(formatterName = "stylish") {
  try {
    const formatterPath = require.resolve(
      `solhint/lib/formatters/${formatterName}`
    );
    return require(formatterPath);
  } catch (ex: any) {
    throw new NomicLabsHardhatPluginError(
      "@nomiclabs/hardhat-solhint",
      `An error occurred loading the solhint formatter ${formatterName}`,
      ex
    );
  }
}

async function hasConfigFile(rootDirectory: string) {
  const files = [
    ".solhint.json",
    ".solhintrc",
    ".solhintrc.json",
    ".solhintrc.yaml",
    ".solhintrc.yml",
    ".solhintrc.js",
    "solhint.config.js",
  ];

  for (const file of files) {
    if (fs.existsSync(join(rootDirectory, file))) {
      return true;
    }
  }
  return false;
}

function readIgnore(rootDirectory: string) {
  try {
    return fs
      .readFileSync(join(rootDirectory, ".solhintignore"))
      .toString()
      .split("\n")
      .map((i) => i.trim())
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function getSolhintConfig(rootDirectory: string) {
  let solhintConfig;
  const {
    loadConfig,
    applyExtends,
  } = require("solhint/lib/config/config-file");
  if (await hasConfigFile(rootDirectory)) {
    try {
      solhintConfig = await loadConfig();
    } catch (err: any) {
      throw new NomicLabsHardhatPluginError(
        "@nomiclabs/hardhat-solhint",
        "An error occurred when loading your solhint config.",
        err
      );
    }
  } else {
    solhintConfig = getDefaultConfig();
  }

  try {
    solhintConfig = applyExtends(solhintConfig);
  } catch (err: any) {
    throw new NomicLabsHardhatPluginError(
      "@nomiclabs/hardhat-solhint",
      "An error occurred when processing your solhint config.",
      err
    );
  }

  const configExcludeFiles = Array.isArray(solhintConfig.excludedFiles)
    ? solhintConfig.excludedFiles
    : [];
  solhintConfig.excludedFiles = [
    ...configExcludeFiles,
    ...readIgnore(rootDirectory),
  ];

  return solhintConfig;
}

function printReport(reports: any) {
  const formatter = getFormatter();
  console.log(formatter(reports));
}

subtask("hardhat-solhint:run-solhint", async (_, { config }) => {
  const { processPath } = require("solhint/lib/index");

  // Create a glob pattern that matches all the .sol files within the sources folder
  const solFilesGlob = join(config.paths.sources, "**", "*.sol");

  // Make glob pattern relative to the current working directory
  // See https://github.com/kaelzhang/node-ignore/tree/5.2.4#1-pathname-should-be-a-pathrelatived-pathname
  const relativeGlob = relative(process.cwd(), solFilesGlob);

  // Fix for Windows users: replace back-slashes with forward-slashes
  // See https://github.com/isaacs/node-glob/tree/v8.0.3#windows
  const normalizedGlob = relativeGlob.replace(/\\/g, "/");

  return processPath(normalizedGlob, await getSolhintConfig(config.paths.root));
});

task("check", async (_, { run }, runSuper) => {
  if (runSuper.isDefined) {
    await runSuper();
  }

  const reports = await run("hardhat-solhint:run-solhint");

  printReport(reports);
});
