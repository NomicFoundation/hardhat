import { extendConfig, internalTask, task } from "hardhat/config";

import {
  TASK_COMPILE_GET_REMAPPINGS,
  TASK_COMPILE_TRANSFORM_IMPORT_NAME,
} from "hardhat/builtin-tasks/task-names";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { existsSync, writeFileSync } from "fs";
import path from "path";
import picocolors from "picocolors";
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
        picocolors.yellow(
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

  // Ensure foundry src path doesn't mismatch user-configured path
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
  config.paths.sources = path.resolve(config.paths.root, foundrySourcesPath);

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

// This task is in place to detect old hardhat-core versions
internalTask(TASK_COMPILE_TRANSFORM_IMPORT_NAME).setAction(
  async (
    {
      importName,
      deprecationCheck,
    }: { importName: string; deprecationCheck: boolean },
    _hre
  ): Promise<string> => {
    // When the deprecationCheck param is passed, it means a new enough hardhat-core is being used
    if (deprecationCheck) {
      return importName;
    }
    throw new HardhatFoundryError(
      "This version of hardhat-foundry depends on hardhat version >= 2.17.2"
    );
  }
);

internalTask(TASK_COMPILE_GET_REMAPPINGS).setAction(
  async (): Promise<Record<string, string>> => {
    if (!pluginActivated) {
      return {};
    }

    return getRemappings();
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
      console.warn(
        picocolors.yellow(`File foundry.toml already exists. Aborting.`)
      );
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
