import { extendConfig, internalTask, task } from "hardhat/config";

import {
  TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT,
  TASK_COMPILE_TRANSLATE_IMPORT_NAME,
} from "hardhat/builtin-tasks/task-names";
import {
  CompilationJob,
  CompilerInput,
  HardhatRuntimeEnvironment,
} from "hardhat/types";
import { existsSync, writeFileSync } from "fs";
import path from "path";
import { getRemappings } from "./getRemappings";
import { runCmdSync } from "./runCmd";
import { HardhatFoundryError } from "./errors";

const TASK_INIT_FOUNDRY = "hardhat-foundry:init-foundry";

extendConfig(async (config, userConfig) => {
  // Check foundry.toml presence. Don't warn when running foundry initialization task
  if (!existsSync(path.join(config.paths.root, "foundry.toml"))) {
    if (!process.argv.includes(TASK_INIT_FOUNDRY)) {
      console.warn(
        `Warning: No foundry.toml file found at ${config.paths.root}, hardhat-foundry plugin will not activate. Consider running 'npx hardhat ${TASK_INIT_FOUNDRY}'`
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
  if (foundryConfig.cache_path === "cache") {
    config.paths.cache = "cache_hardhat";
  }

  // Task that translates import names to sourcenames using remappings
  internalTask(TASK_COMPILE_TRANSLATE_IMPORT_NAME).setAction(
    async ({ importName }: { importName: string }): Promise<string> => {
      const remappings = getRemappings();

      for (const from in remappings) {
        if (Object.prototype.hasOwnProperty.call(remappings, from)) {
          const to = remappings[from];
          if (importName.startsWith(from)) {
            return importName.replace(from, to);
          }
        }
      }

      return importName;
    }
  );

  // Task that includes the remappings in solc input
  internalTask(TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT).setAction(
    async (
      { compilationJob }: { compilationJob: CompilationJob },
      _hre,
      runSuper
    ): Promise<CompilerInput> => {
      const input = (await runSuper({ compilationJob })) as CompilerInput;

      const remappings = getRemappings();
      input.settings.remappings = Object.entries(remappings).map((fromTo) =>
        fromTo.join("=")
      );

      return input;
    }
  );
});

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
    console.log(`Running ${cmd}`);
    runCmdSync(cmd);
  }
);
