import "@nomiclabs/hardhat-ethers";
import { Module, ModuleDict, ModuleParams } from "@ignored/ignition-core";
import { BigNumber } from "ethers";
import fs from "fs-extra";
import { extendConfig, extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import path from "path";

import { buildIgnitionProvidersFrom } from "./buildIgnitionProvidersFrom";
import { IgnitionWrapper } from "./ignition-wrapper";
import { Renderer } from "./plan";
import { loadUserModules, loadAllUserModules } from "./user-modules";
import "./type-extensions";

export { buildSubgraph, buildModule } from "@ignored/ignition-core";

export interface IgnitionConfig {
  maxRetries: number;
  gasIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  eventDuration: number;
}

/* ignition config defaults */
const IGNITION_DIR = "ignition";
const DEPLOYMENTS_DIR = "deployments";
const MAX_RETRIES = 4;
const GAS_INCREMENT_PER_RETRY = null;
const POLLING_INTERVAL = 300;
const AWAIT_EVENT_DURATION = 3000; // ms

extendConfig((config, userConfig) => {
  /* setup path configs */
  const userPathsConfig = userConfig.paths ?? {};

  config.paths = {
    ...config.paths,
    ignition: path.resolve(
      config.paths.root,
      userPathsConfig.ignition ?? IGNITION_DIR
    ),
    deployments: path.resolve(
      config.paths.root,
      userPathsConfig.deployments ?? DEPLOYMENTS_DIR
    ),
  };

  /* setup core configs */
  const userIgnitionConfig = userConfig.ignition ?? {};

  config.ignition = {
    maxRetries: userIgnitionConfig.maxRetries ?? MAX_RETRIES,
    gasIncrementPerRetry:
      userIgnitionConfig.gasIncrementPerRetry ?? GAS_INCREMENT_PER_RETRY,
    pollingInterval: userIgnitionConfig.pollingInterval ?? POLLING_INTERVAL,
    eventDuration: userIgnitionConfig.eventDuration ?? AWAIT_EVENT_DURATION,
  };
});

/**
 * Add an `ignition` object to the HRE.
 */
extendEnvironment((hre) => {
  const providers = buildIgnitionProvidersFrom(hre);

  hre.ignition = lazyObject(() => {
    const isHardhatNetwork = hre.network.name === "hardhat";

    const txPollingInterval = isHardhatNetwork ? 100 : 5000;

    return new IgnitionWrapper(providers, hre.ethers, {
      ...hre.config.ignition,
      txPollingInterval,
      networkName: hre.network.name,
    });
  });
});

task("deploy")
  .addOptionalVariadicPositionalParam("userModulesPaths")
  .addOptionalParam(
    "parameters",
    "A JSON object as a string, of the module parameters, or a relative path to a JSON file"
  )
  .setAction(
    async (
      {
        userModulesPaths = [],
        parameters: parametersInput,
      }: { userModulesPaths: string[]; parameters?: string },
      hre
    ) => {
      await hre.run("compile", { quiet: true });

      let userModules: Array<Module<ModuleDict>>;
      if (userModulesPaths.length === 0) {
        userModules = loadAllUserModules(hre.config.paths.ignition);
      } else {
        userModules = loadUserModules(
          hre.config.paths.ignition,
          userModulesPaths
        );
      }

      if (userModules.length === 0) {
        console.warn("No Ignition modules found");
        process.exit(0);
      }

      const [userModule] = userModules;

      let parameters: ModuleParams | undefined;
      if (parametersInput === undefined) {
        parameters = resolveParametersFromModuleName(
          userModule.name,
          hre.config.paths.ignition
        );
      } else if (parametersInput.endsWith(".json")) {
        parameters = resolveParametersFromFileName(parametersInput);
      } else {
        parameters = resolveParametersString(parametersInput);
      }

      const isHardhatNetwork = hre.network.name === "hardhat";
      const journalPath = isHardhatNetwork
        ? undefined
        : resolveJournalPath(userModule.name, hre.config.paths.ignition);

      try {
        await hre.ignition.deploy(userModule, {
          parameters,
          journalPath,
          ui: true,
        });
      } catch {
        // display of error or on hold is done
        // based on state, thrown error can be ignored
        process.exit(1);
      }
    }
  );

task("plan")
  .addFlag("quiet", "Disables logging output path to terminal")
  .addOptionalVariadicPositionalParam("userModulesPaths")
  .setAction(
    async (
      {
        quiet = false,
        userModulesPaths = [],
      }: { quiet: boolean; userModulesPaths: string[] },
      hre
    ) => {
      await hre.run("compile", { quiet: true });

      let userModules: Array<Module<ModuleDict>>;
      if (userModulesPaths.length === 0) {
        userModules = loadAllUserModules(hre.config.paths.ignition);
      } else {
        userModules = loadUserModules(
          hre.config.paths.ignition,
          userModulesPaths
        );
      }

      if (userModules.length === 0) {
        console.warn("No Ignition modules found");
        process.exit(0);
      }

      const [module] = userModules;

      const plan = await hre.ignition.plan(module);

      const renderer = new Renderer(module.name, plan, {
        cachePath: hre.config.paths.cache,
        network: {
          name: hre.network.name,
          id: hre.network.config.chainId ?? "unknown",
        },
      });

      renderer.write();

      if (!quiet) {
        console.log(`Plan written to ${renderer.planPath}/index.html`);
        renderer.open();
      }
    }
  );

function resolveParametersFromModuleName(
  moduleName: string,
  ignitionPath: string
): ModuleParams | undefined {
  const files = fs.readdirSync(ignitionPath);
  const configFilename = `${moduleName}.config.json`;

  return files.includes(configFilename)
    ? resolveConfigPath(path.resolve(ignitionPath, configFilename))
    : undefined;
}

function resolveParametersFromFileName(fileName: string): ModuleParams {
  const filepath = path.resolve(process.cwd(), fileName);

  return resolveConfigPath(filepath);
}

function resolveConfigPath(filepath: string): ModuleParams {
  try {
    return require(filepath);
  } catch {
    console.warn(`Could not parse parameters from ${filepath}`);
    process.exit(0);
  }
}

function resolveJournalPath(moduleName: string, ignitionPath: string) {
  const journalFile = `${moduleName}.journal.ndjson`;

  return path.join(ignitionPath, journalFile);
}

function resolveParametersString(paramString: string): ModuleParams {
  try {
    return JSON.parse(paramString);
  } catch {
    console.warn(`Could not parse JSON parameters`);
    process.exit(0);
  }
}
