import { internalTask, task } from "@nomiclabs/buidler/config";
import { BuidlerPluginError } from "@nomiclabs/buidler/internal/core/errors";
import * as fs from "fs";
import { join } from "path";

function getDefaultConfig() {
  return {
    extends: ["solhint:default"]
  };
}

function getFormatter(formatterName = "stylish") {
  try {
    return require(`eslint/lib/formatters/${formatterName}`);
  } catch (ex) {
    throw new BuidlerPluginError(
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
    "solhint.config.js"
  ];

  for (const file of files) {
    if (fs.existsSync(join(rootDirectory, file))) {
      return true;
    }
  }
  return false;
}

async function getSolhintConfig(rootDirectory: string) {
  let solhintConfig;
  const { loadConfig, applyExtends } = await import(
    "solhint/lib/config/config-file"
  );
  if (await hasConfigFile(rootDirectory)) {
    try {
      solhintConfig = await loadConfig();
    } catch (err) {
      throw new BuidlerPluginError(
        "An error occurred when loading your solhint config.",
        err
      );
    }
  } else {
    solhintConfig = getDefaultConfig();
  }

  try {
    solhintConfig = applyExtends(solhintConfig);
  } catch (err) {
    throw new BuidlerPluginError(
      "An error occurred when processing your solhint config.",
      err
    );
  }

  return solhintConfig;
}

function printReport(reports: any) {
  const formatter = getFormatter();
  console.log(formatter(reports));
}

export default function() {
  internalTask("buidler-solhint:run-solhint", async (_, { config }) => {
    const { processPath } = await import("solhint/lib/index");
    return processPath(
      join(config.paths.sources, "**", "*.sol"),
      await getSolhintConfig(config.paths.root)
    );
  });

  task("check", async (_, { run }, runSuper) => {
    if (runSuper.isDefined) {
      await runSuper();
    }

    const reports = await run("buidler-solhint:run-solhint");

    printReport(reports);
  });
}
