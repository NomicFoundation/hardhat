import { extendConfig, internalTask, task } from "hardhat/config";

import {
  TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE,
  TASK_COMPILE_TRANSLATE_IMPORT_NAME,
} from "hardhat/builtin-tasks/task-names";
import { SolidityFilesCache } from "hardhat/builtin-tasks/utils/solidity-files-cache";
import {
  CompilationJob,
  CompilationJobCreationError,
  DependencyGraph,
  HardhatRuntimeEnvironment,
  ResolvedFile,
} from "hardhat/types";
import { existsSync, writeFileSync } from "fs";
import path from "path";
import chalk from "chalk";
import { getRemappings } from "./getRemappings";
import { runCmdSync } from "./runCmd";
import { HardhatFoundryError } from "./errors";

const TASK_INIT_FOUNDRY = "init-foundry";

let pluginActivated = false;

extendConfig(async (config, userConfig) => {
  // Check foundry.toml presence. Don't warn when running foundry initialization task
  if (!existsSync(path.join(config.paths.root, "foundry.toml"))) {
    if (!process.argv.includes(TASK_INIT_FOUNDRY)) {
      console.log(
        chalk.yellow(
          `Warning: No foundry.toml file found at ${config.paths.root}, hardhat-foundry plugin will not activate. Consider running 'npx hardhat ${TASK_INIT_FOUNDRY}'`
        )
      );
    }
    return;
  }

  // Load foundry config
  const foundryConfig = JSON.parse(runCmdSync("forge config --json"));

  // Ensure required keys exist
  if (
    foundryConfig?.src === undefined ||
    foundryConfig?.cache_path === undefined
  ) {
    throw new HardhatFoundryError(
      "Couldn't find `src` or `cache_path` config keys after running `forge config --json`"
    );
  }

  // Ensure foundry src path doesnt mismatch user-configured path
  const userSourcesPath = userConfig.paths?.sources;
  const foundrySourcesPath = foundryConfig.src;

  if (userSourcesPath !== undefined && userSourcesPath !== foundrySourcesPath) {
    throw new HardhatFoundryError(
      `User-configured sources path (${userSourcesPath}) doesn't match path configured in foundry (${foundrySourcesPath})`
    );
  }

  // Set sources path
  config.paths.sources = foundryConfig.src;

  // Change hardhat's cache path if it clashes with foundry's
  const foundryCachePath = path.resolve(
    config.paths.root,
    foundryConfig.cache_path
  );
  if (config.paths.cache === foundryCachePath) {
    config.paths.cache = "cache_hardhat";
  }

  pluginActivated = true;
});

// Task that translates import names to sourcenames using remappings
internalTask(TASK_COMPILE_TRANSLATE_IMPORT_NAME).setAction(
  async (
    { importName }: { importName: string },
    _hre,
    runSuper
  ): Promise<string> => {
    if (!pluginActivated) {
      return runSuper({ importName });
    }

    const remappings = getRemappings();

    for (const [from, to] of Object.entries(remappings)) {
      if (importName.startsWith(from)) {
        return importName.replace(from, to);
      }
    }

    return importName;
  }
);

// Task that includes the remappings in solc input
internalTask(TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE).setAction(
  async (
    {
      dependencyGraph,
      file,
    }: {
      dependencyGraph: DependencyGraph;
      file: ResolvedFile;
      solidityFilesCache?: SolidityFilesCache;
    },
    hre,
    runSuper
  ): Promise<CompilationJob | CompilationJobCreationError> => {
    const job = (await runSuper({ dependencyGraph, file })) as
      | CompilationJob
      | CompilationJobCreationError;

    if (!pluginActivated || isCompilationJobCreationError(job)) {
      return job;
    }

    const remappings = getRemappings();
    job.getSolcConfig().settings.remappings = Object.entries(remappings).map(
      ([from, to]) => `${from}=${to}`
    );

    return job;
  }
);

task(
  TASK_INIT_FOUNDRY,
  "Initialize foundry setup in current hardhat project",
  async (_, hre: HardhatRuntimeEnvironment) => {
    if (existsSync("foundry.toml")) {
      console.log(`File foundry.toml already exists. Aborting.`);
      return;
    }

    console.log(`Creating foundry.toml file...`);

    writeFileSync(
      "foundry.toml",
      [
        `[profile.default]`,
        `src = '${path.relative(
          hre.config.paths.root,
          hre.config.paths.sources
        )}'`,
        `out = 'out'`,
        `libs = ['node_modules', 'lib']`,
        `test = '${path.relative(
          hre.config.paths.root,
          hre.config.paths.tests
        )}'`,
        `cache_path  = 'cache_forge'`,
      ].join("\n")
    );

    const cmd = `forge install --no-commit foundry-rs/forge-std`;
    console.log(`Running ${chalk.blue(cmd)}`);
    try {
      runCmdSync(cmd);
    } catch (error) {
      console.log(
        chalk.red(
          `Command failed. Please continue forge-std installation manually.`
        )
      );
      console.log(error);
    }
  }
);

function isCompilationJobCreationError(
  x: CompilationJob | CompilationJobCreationError
): x is CompilationJobCreationError {
  return "reason" in x;
}
