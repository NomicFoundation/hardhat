import { extendConfig, internalTask, task } from "hardhat/config";

import {
  TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOB_FOR_FILE,
  TASK_COMPILE_TRANSFORM_IMPORT_NAME,
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
import {
  getForgeConfig,
  getRemappings,
  HardhatFoundryError,
  installDependency,
} from "./foundry";

const TASK_INIT_FOUNDRY = "init-foundry";

let pluginActivated = false;

extendConfig((config, userConfig) => {
  // Check foundry.toml presence. Don't warn when running foundry initialization task
  if (!existsSync(path.join(config.paths.root, "foundry.toml"))) {
    if (!process.argv.includes(TASK_INIT_FOUNDRY)) {
      console.log(
        chalk.yellow(
          `Warning: You are using the hardhat-foundry plugin but there isn't a foundry.toml file in your project. Run 'npx hardhat ${TASK_INIT_FOUNDRY}' to create one.`
        )
      );
    }
    return;
  }

  // Load foundry config
  const foundryConfig = getForgeConfig();

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

  if (
    userSourcesPath !== undefined &&
    path.resolve(userSourcesPath) !== path.resolve(foundrySourcesPath)
  ) {
    throw new HardhatFoundryError(
      `User-configured sources path (${userSourcesPath}) doesn't match path configured in foundry (${foundrySourcesPath})`
    );
  }

  // Set sources path
  config.paths.sources = foundrySourcesPath;

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

// Task that transforms import names to sourcenames using remappings
internalTask(TASK_COMPILE_TRANSFORM_IMPORT_NAME).setAction(
  async (
    { importName }: { importName: string },
    _hre,
    runSuper
  ): Promise<string> => {
    if (!pluginActivated) {
      return runSuper({ importName });
    }

    const remappings = await getRemappings();

    for (const [from, to] of Object.entries(remappings)) {
      if (importName.startsWith(from) && !importName.startsWith(".")) {
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

    const remappings = await getRemappings();
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
    const foundryConfigPath = path.resolve(
      hre.config.paths.root,
      "foundry.toml"
    );

    if (existsSync(foundryConfigPath)) {
      console.warn(chalk.yellow(`File foundry.toml already exists. Aborting.`));
      process.exit(1);
    }

    console.log(`Creating foundry.toml file...`);

    writeFileSync(
      foundryConfigPath,
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

    await installDependency("foundry-rs/forge-std");
  }
);

function isCompilationJobCreationError(
  x: CompilationJob | CompilationJobCreationError
): x is CompilationJobCreationError {
  return "reason" in x;
}
