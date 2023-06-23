import {
  deploy,
  Module,
  ModuleConstructor,
  ModuleDict,
  ModuleParams,
  wipe,
} from "@ignored/ignition-core";
import "@nomiclabs/hardhat-ethers";
import { BigNumber } from "ethers";
import fs from "fs-extra";
import { extendConfig, extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import path from "path";
import prompts from "prompts";

import { buildAdaptersFrom } from "./buildAdaptersFrom";
import { buildIgnitionProvidersFrom } from "./buildIgnitionProvidersFrom";
import { HardhatArtifactResolver } from "./hardhat-artifact-resolver.ts";
import { IgnitionHelper } from "./ignition-helper";
import { IgnitionWrapper } from "./ignition-wrapper";
import { loadModule } from "./load-module";
import { writePlan } from "./plan/write-plan";
import "./type-extensions";
import { renderInfo } from "./ui/components/info";
import { open } from "./utils/open";

export { buildModule, defineModule } from "@ignored/ignition-core";

export interface IgnitionConfig {
  maxRetries: number;
  gasPriceIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  eventDuration: number;
}

const DISPLAY_UI = process.env.DEBUG === undefined;

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

  hre.ignition2 = lazyObject(() => {
    // const isHardhatNetwork = hre.network.name === "hardhat";

    // TODO: rewire txPollingInterval
    // const txPollingInterval = isHardhatNetwork ? 100 : 5000;

    return new IgnitionHelper(hre);
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
      const chainId = Number(
        await hre.network.provider.request({
          method: "eth_chainId",
        })
      );

      if (chainId !== 31337) {
        const prompt = await prompts({
          type: "confirm",
          name: "networkConfirmation",
          message: `Confirm deploy to network ${hre.network.name} (${chainId})?`,
          initial: false,
        });

        if (prompt.networkConfirmation !== true) {
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

task("deploy2")
  .addPositionalParam("moduleNameOrPath")
  .addOptionalParam(
    "parameters",
    "A JSON object as a string, of the module parameters, or a relative path to a JSON file"
  )
  .addOptionalParam("id", "set the deployment id")
  .addFlag("force", "restart the deployment ignoring previous history")
  .setAction(
    async (
      {
        moduleNameOrPath,
        parameters: parametersInput,
        id: givenDeploymentId,
      }: {
        moduleNameOrPath: string;
        parameters?: string;
        force: boolean;
        id: string;
      },
      hre
    ) => {
      const chainId = Number(
        await hre.network.provider.request({
          method: "eth_chainId",
        })
      );

      if (chainId !== 31337) {
        const prompt = await prompts({
          type: "confirm",
          name: "networkConfirmation",
          message: `Confirm deploy to network ${hre.network.name} (${chainId})?`,
          initial: false,
        });

        if (prompt.networkConfirmation !== true) {
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

      const accounts = (await hre.network.provider.request({
        method: "eth_accounts",
      })) as string[];

      try {
        const deploymentId = givenDeploymentId ?? `network-${chainId}`;

        const deploymentDir =
          hre.network.name === "hardhat"
            ? undefined
            : path.join(hre.config.paths.ignition, "deployments", deploymentId);

        const artifactResolver = new HardhatArtifactResolver(hre);
        const adapters = buildAdaptersFrom(hre);

        const result = await deploy({
          adapters,
          artifactResolver,
          deploymentDir,
          moduleDefinition: userModule as any,
          deploymentParameters: parameters as any,
          accounts,
        });

        if (result.status === "success") {
          console.log("Deployment complete");
          console.log("");

          for (const [
            futureId,
            { contractName, contractAddress },
          ] of Object.entries(result.contracts)) {
            console.log(`${contractName} (${futureId}) - ${contractAddress}`);
          }
        } else if (result.status === "failure") {
          console.log("Deployment failed");
          console.log("");

          for (const [futureId, error] of Object.entries(result.errors)) {
            const errorMessage =
              "reason" in error ? (error.reason as string) : error.message;

            console.log(`Future ${futureId} failed: ${errorMessage}`);
          }
        } else if (result.status === "hold") {
          console.log("Deployment held");
        }
      } catch (err) {
        // TODO: bring back cli ui
        // if (DISPLAY_UI) {
        //   // display of error or on hold is done
        //   // based on state, thrown error display
        //   // can be ignored
        //   process.exit(1);
        // } else {
        throw err;
        // }
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

      // TODO: alter loadModule to return new-api modules at type level
      const userModule: any = loadModule(
        hre.config.paths.ignition,
        moduleNameOrPath
      );

      if (userModule === undefined) {
        console.warn("No Ignition modules found");
        process.exit(0);
      }

      const chainId = Number(
        await hre.network.provider.request({
          method: "eth_chainId",
        })
      );

      const constructor = new ModuleConstructor();
      const module = constructor.construct(userModule);

      await writePlan(
        {
          details: {
            networkName: hre.network.name,
            chainId,
          },
          module,
        },
        { cacheDir: hre.config.paths.cache }
      );

      if (!quiet) {
        const indexFile = path.join(
          hre.config.paths.cache,
          "plan",
          "index.html"
        );

        console.log(`Plan written to ${indexFile}`);

        open(indexFile);
      }
    }
  );

task("ignition-info")
  .addPositionalParam("moduleNameOrPath")
  .setDescription("Lists the status of all deployments")
  .setAction(
    async ({ moduleNameOrPath }: { moduleNameOrPath: string }, hre) => {
      const userModule: Module<ModuleDict> | undefined = loadModule(
        hre.config.paths.ignition,
        moduleNameOrPath
      );

      if (userModule === undefined) {
        console.warn("No Ignition modules found");
        process.exit(0);
      }

      const journalPath = resolveJournalPath(
        userModule?.name,
        hre.config.paths.ignition
      );

      const moduleInfo = await hre.ignition.info(userModule.name, journalPath);

      renderInfo(Object.values(moduleInfo));
    }
  );

task("ignition-info2")
  .addParam("deploymentId")
  .addFlag("json", "format as json")
  .setDescription("Lists the deployed contract addresses of a deployment")
  .setAction(
    async (
      {
        deploymentId,
        json: formatAsJson,
      }: { deploymentId: string; json: boolean },
      hre
    ) => {
      const deploymentDir = path.join(
        hre.config.paths.ignition,
        "deployments",
        deploymentId
      );
      const deployedAddressesPath = path.join(
        deploymentDir,
        "deployed_addresses.json"
      );

      if (!fs.existsSync(deploymentDir)) {
        console.error(`No deployment found with id ${deploymentDir}`);
        process.exit(1);
      }

      if (!fs.existsSync(deployedAddressesPath)) {
        console.log(`No contracts deployed`);
        process.exit(0);
      }

      const deployedAddresses = fs.readJSONSync(deployedAddressesPath);

      if (formatAsJson) {
        console.log(JSON.stringify(deployedAddresses, undefined, 2));
      } else {
        console.log("Deployed Addresses");
        console.log("==================");
        console.log("");

        for (const [futureId, address] of Object.entries(deployedAddresses)) {
          console.log(`${futureId}\t${address as string}`);
        }

        console.log("");
      }
    }
  );

task("wipe")
  .addParam("deployment")
  .addParam("future")
  .setDescription("Reset a deployments future to allow rerunning")
  .setAction(
    async (
      {
        deployment: deploymentId,
        future: futureId,
      }: { deployment: string; future: string },
      hre
    ) => {
      const deploymentDir = path.join(
        hre.config.paths.ignition,
        "deployments",
        deploymentId
      );

      await wipe(deploymentDir, futureId);

      console.log(`${futureId} state has been cleared`);
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
