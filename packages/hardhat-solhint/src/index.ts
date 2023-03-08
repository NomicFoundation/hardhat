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
  return processPath(
    /**
     * Solhint passes the following path to the `node-glob` library.
     * `path.join()` and `path.relative()` return back-slashes as path separator on Windows.
     * However, glob pattern paths must use forward-slashes as path separators, since "\" is an escape character to match literal glob pattern characters.
     * That's why we replace back-slashes with forward-slashes below.
     *
     * @see https://github.com/isaacs/node-glob/tree/v8.0.3#windows
     *
     * The files paths matching the glob pattern are then passed to `node-ignore`, which requires relative pathnames.
     * For this reason, we pass a relative pathname to `processPath()`.
     *
     * @see https://github.com/kaelzhang/node-ignore/tree/5.2.4#1-pathname-should-be-a-pathrelatived-pathname
     */
    relative(
      config.paths.root,
      join(config.paths.sources, "**", "*.sol")
    ).replace(/\\/g, "/"),
    await getSolhintConfig(config.paths.root)
  );
});

task("check", async (_, { run }, runSuper) => {
  if (runSuper.isDefined) {
    await runSuper();
  }

  const reports = await run("hardhat-solhint:run-solhint");

  printReport(reports);
});
