import "@nomiclabs/hardhat-ethers";
import { Module, ModuleDict, ModuleParams } from "@ignored/ignition-core";
import { BigNumber } from "ethers";
import fs from "fs-extra";
import { extendConfig, extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import path from "path";
import prompts from "prompts";

import { buildIgnitionProvidersFrom } from "./buildIgnitionProvidersFrom";
import { IgnitionWrapper } from "./ignition-wrapper";
import { loadModule } from "./load-module";
import { Renderer } from "./plan";
import "./type-extensions";

export { buildSubgraph, buildModule } from "@ignored/ignition-core";

export interface IgnitionConfig {
  maxRetries: number;
  gasPriceIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  eventDuration: number;
}

const DISPLAY_UI = !Boolean(process.env.DEBUG);

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
    gasPriceIncrementPerRetry:
      userIgnitionConfig.gasPriceIncrementPerRetry ?? GAS_INCREMENT_PER_RETRY,
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
  .addPositionalParam("moduleNameOrPath")
  .addOptionalParam(
    "parameters",
    "A JSON object as a string, of the module parameters, or a relative path to a JSON file"
  )
  .addFlag("force", "restart the deployment ignoring previous history")
  .setAction(
    async (
      {
        moduleNameOrPath,
        parameters: parametersInput,
        force,
      }: { moduleNameOrPath: string; parameters?: string; force: boolean },
      hre
    ) => {
      if (hre.network.name !== "hardhat") {
        const chainId = await hre.network.provider.request({
          method: "eth_chainId",
        });

        const prompt = await prompts({
          type: "confirm",
          name: "networkConfirmation",
          message: `Confirm deploy to network ${hre.network.name} (${Number(
            chainId
          )})?`,
          initial: false,
        });

        if (!prompt.networkConfirmation) {
          console.log("Deploy cancelled");
          return;
        }
      }

      await hre.run("compile", { quiet: true });

      const userModule: Module<ModuleDict> | undefined = loadModule(
        hre.config.paths.ignition,
        moduleNameOrPath
      );

      if (userModule === undefined) {
        console.warn("No Ignition modules found");
        process.exit(0);
      }

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
          ui: DISPLAY_UI,
          force,
        });
      } catch (err) {
        if (DISPLAY_UI) {
          // display of error or on hold is done
          // based on state, thrown error display
          // can be ignored
          process.exit(1);
        } else {
          throw err;
        }
      }
    }
  );

task("plan")
  .addFlag("quiet", "Disables logging output path to terminal")
  .addPositionalParam("moduleNameOrPath")
  .setAction(
    async (
      {
        quiet = false,
        moduleNameOrPath,
      }: { quiet: boolean; moduleNameOrPath: string },
      hre
    ) => {
      await hre.run("compile", { quiet: true });

      const userModule: Module<ModuleDict> | undefined = loadModule(
        hre.config.paths.ignition,
        moduleNameOrPath
      );

      if (userModule === undefined) {
        console.warn("No Ignition modules found");
        process.exit(0);
      }

      const plan = await hre.ignition.plan(userModule);

      const renderer = new Renderer(userModule.name, plan, {
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
