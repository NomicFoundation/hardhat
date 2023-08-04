import {
  deploy,
  DeploymentParameters,
  ModuleConstructor,
  wipe,
} from "@ignored/ignition-core";
import "@nomiclabs/hardhat-ethers";
import { existsSync, readdirSync, readJSONSync } from "fs-extra";
import { extendConfig, extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import path from "path";
import Prompt from "prompts";

import { HardhatArtifactResolver } from "./hardhat-artifact-resolver.ts";
import { IgnitionHelper } from "./ignition-helper";
import { loadModule } from "./load-module";
import { writePlan } from "./plan/write-plan";
import { open } from "./utils/open";

import "./type-extensions";

// eslint-disable-next-line import/no-unused-modules
export { buildModule } from "@ignored/ignition-core";

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
  .addFlag("logs", "output journal logs to the terminal")
  .setAction(
    async (
      {
        moduleNameOrPath,
        parameters: parametersInput,
        logs,
        id: givenDeploymentId,
      }: {
        moduleNameOrPath: string;
        parameters?: string;
        force: boolean;
        logs: boolean;
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

      try {
        const deploymentId = givenDeploymentId ?? `network-${chainId}`;

        const deploymentDir =
          hre.network.name === "hardhat"
            ? undefined
            : path.join(hre.config.paths.ignition, "deployments", deploymentId);

        const artifactResolver = new HardhatArtifactResolver(hre);

        const result = await deploy({
          config: hre.config.ignition,
          provider: hre.network.provider,
          artifactResolver,
          deploymentDir,
          moduleDefinition: userModule,
          deploymentParameters: parameters ?? {},
          accounts,
          verbose: logs,
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
        } else if (result.status === "timeout") {
          console.log("Deployment halted due to timeout");
          console.log("");

          for (const { futureId, executionId, txHash } of result.timeouts) {
            console.log(`  ${txHash} (${futureId}/${executionId})`);
          }
        } else if (result.status === "hold") {
          console.log("Deployment held");
        } else {
          assertNeverResult(result);
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

      const userModule = loadModule(
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

      await wipe(deploymentDir, futureId);

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

function assertNeverResult(result: never) {
  throw new Error(`Unknown result from deploy: ${JSON.stringify(result)}`);
}
