import "@nomicfoundation/hardhat-ethers";
import {
  deploy,
  DeploymentParameters,
  IgnitionModuleSerializer,
  wipe,
} from "@nomicfoundation/ignition-core";
import { existsSync, readdirSync, readJSONSync } from "fs-extra";
import { extendConfig, extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import path from "path";
import Prompt from "prompts";

import { HardhatArtifactResolver } from "./hardhat-artifact-resolver";
import { IgnitionHelper } from "./ignition-helper";
import { loadModule } from "./load-module";
import { UiEventHandler } from "./ui/UiEventHandler";
import { VerboseEventHandler } from "./ui/VerboseEventHandler";
import { open } from "./utils/open";
import { writeVisualization } from "./visualization/write-visualization";

import "./type-extensions";

// eslint-disable-next-line import/no-unused-modules
export { buildModule } from "@nomicfoundation/ignition-core";

/* ignition config defaults */
const IGNITION_DIR = "ignition";

extendConfig((config, userConfig) => {
  /* setup path configs */
  const userPathsConfig = userConfig.paths ?? {};

  config.paths = {
    ...config.paths,
    ignition: path.resolve(
      config.paths.root,
      userPathsConfig.ignition ?? IGNITION_DIR
    ),
  };

  /* setup core configs */
  const userIgnitionConfig = userConfig.ignition ?? {};

  config.ignition = userIgnitionConfig;
});

/**
 * Add an `ignition` object to the HRE.
 */
extendEnvironment((hre) => {
  hre.ignition = lazyObject(() => {
    return new IgnitionHelper(hre);
  });
});

task("deploy")
  .addPositionalParam("moduleNameOrPath")
  .addOptionalParam(
    "parameters",
    "A JSON object as a string, of the module parameters, or a relative path to a JSON file"
  )
  .addOptionalParam("id", "set the deployment id")
  .addFlag("force", "restart the deployment ignoring previous history")
  .addFlag(
    "simpleTextUi",
    "use a simple text based UI instead of the default UI"
  )
  .setAction(
    async (
      {
        moduleNameOrPath,
        parameters: parametersInput,
        simpleTextUi,
        id: givenDeploymentId,
      }: {
        moduleNameOrPath: string;
        parameters?: string;
        force: boolean;
        simpleTextUi: boolean;
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
        const prompt = await Prompt({
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

      const userModule = loadModule(
        hre.config.paths.ignition,
        moduleNameOrPath
      );

      if (userModule === undefined) {
        console.warn("No Ignition modules found");
        process.exit(0);
      }

      let parameters: DeploymentParameters | undefined;
      if (parametersInput === undefined) {
        parameters = resolveParametersFromModuleName(
          userModule.id,
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

      const deploymentId = givenDeploymentId ?? `network-${chainId}`;

      const deploymentDir =
        hre.network.name === "hardhat"
          ? undefined
          : path.join(hre.config.paths.ignition, "deployments", deploymentId);

      const artifactResolver = new HardhatArtifactResolver(hre);

      const executionEventListener = simpleTextUi
        ? new VerboseEventHandler()
        : new UiEventHandler(parameters);

      try {
        await deploy({
          config: hre.config.ignition,
          provider: hre.network.provider,
          executionEventListener,
          artifactResolver,
          deploymentDir,
          ignitionModule: userModule,
          deploymentParameters: parameters ?? {},
          accounts,
        });
      } catch (e) {
        if (executionEventListener instanceof UiEventHandler) {
          executionEventListener.unmountCli();
        }
        throw e;
      }
    }
  );

task("visualize")
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

      const userModule = loadModule(
        hre.config.paths.ignition,
        moduleNameOrPath
      );

      if (userModule === undefined) {
        console.warn("No Ignition modules found");
        process.exit(0);
      }

      const serializedIgnitionModule =
        IgnitionModuleSerializer.serialize(userModule);

      await writeVisualization(
        { module: serializedIgnitionModule },
        {
          cacheDir: hre.config.paths.cache,
        }
      );

      if (!quiet) {
        const indexFile = path.join(
          hre.config.paths.cache,
          "visualization",
          "index.html"
        );

        console.log(`Deployment visualization written to ${indexFile}`);

        open(indexFile);
      }
    }
  );

task("ignition-info")
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

      if (!existsSync(deploymentDir)) {
        console.error(`No deployment found with id ${deploymentDir}`);
        process.exit(1);
      }

      if (!existsSync(deployedAddressesPath)) {
        console.log(`No contracts deployed`);
        process.exit(0);
      }

      const deployedAddresses = readJSONSync(deployedAddressesPath);

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

      await wipe(deploymentDir, new HardhatArtifactResolver(hre), futureId);

      console.log(`${futureId} state has been cleared`);
    }
  );

function resolveParametersFromModuleName(
  moduleName: string,
  ignitionPath: string
): DeploymentParameters | undefined {
  const files = readdirSync(ignitionPath);
  const configFilename = `${moduleName}.config.json`;

  return files.includes(configFilename)
    ? resolveConfigPath(path.resolve(ignitionPath, configFilename))
    : undefined;
}

function resolveParametersFromFileName(fileName: string): DeploymentParameters {
  const filepath = path.resolve(process.cwd(), fileName);

  return resolveConfigPath(filepath);
}

function resolveConfigPath(filepath: string): DeploymentParameters {
  try {
    return require(filepath);
  } catch {
    console.warn(`Could not parse parameters from ${filepath}`);
    process.exit(0);
  }
}

function resolveParametersString(paramString: string): DeploymentParameters {
  try {
    return JSON.parse(paramString);
  } catch {
    console.warn(`Could not parse JSON parameters`);
    process.exit(0);
  }
}
