import {
  DeploymentParameters,
  IgnitionError,
  StatusResult,
} from "@nomicfoundation/ignition-core";
import "@nomicfoundation/hardhat-ethers";
import chalk from "chalk";
import { readdirSync } from "fs-extra";
import { extendConfig, extendEnvironment, scope } from "hardhat/config";
import { NomicLabsHardhatPluginError, lazyObject } from "hardhat/plugins";
import path from "path";

import "./type-extensions";
import { shouldBeHardhatPluginError } from "./utils/shouldBeHardhatPluginError";

/* ignition config defaults */
const IGNITION_DIR = "ignition";

const ignitionScope = scope(
  "ignition",
  "Deploy your smart contracts using Hardhat Ignition"
);

// this is ugly, but it's fast :)
// discussion: https://github.com/NomicFoundation/hardhat-ignition/pull/483
export const buildModule: typeof import("@nomicfoundation/ignition-core").buildModule =
  (...args) => {
    const { buildModule: coreBuildModule } =
      require("@nomicfoundation/ignition-core") as typeof import("@nomicfoundation/ignition-core");

    return coreBuildModule(...args);
  };

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
    const { IgnitionHelper } = require("./ignition-helper");

    return new IgnitionHelper(hre);
  });
});

ignitionScope
  .task("deploy")
  .addPositionalParam(
    "moduleNameOrPath",
    "The name of the module file within the Ignition modules directory, or a path to the module file"
  )
  .addOptionalParam(
    "parameters",
    "A relative path to a JSON file to use for the module parameters,"
  )
  .addOptionalParam("id", "set the deployment id")
  .setDescription("Deploy a module to the specified network")
  .setAction(
    async (
      {
        moduleNameOrPath,
        parameters: parametersInput,
        id: givenDeploymentId,
      }: {
        moduleNameOrPath: string;
        parameters?: string;
        id: string;
      },
      hre
    ) => {
      const { default: Prompt } = await import("prompts");
      const { deploy } = await import("@nomicfoundation/ignition-core");

      const { HardhatArtifactResolver } = await import(
        "./hardhat-artifact-resolver"
      );
      const { loadModule } = await import("./load-module");

      const { PrettyEventHandler } = await import("./ui/pretty-event-handler");

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

      const executionEventListener = new PrettyEventHandler();

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
        throw e;
      }
    }
  );

ignitionScope
  .task("visualize")
  .addFlag("noOpen", "Disables opening report in browser")
  .addPositionalParam(
    "moduleNameOrPath",
    "The name of the module file within the Ignition modules directory, or a path to the module file"
  )
  .setDescription("Visualize a module as an HTML report")
  .setAction(
    async (
      {
        noOpen = false,
        moduleNameOrPath,
      }: { noOpen: boolean; moduleNameOrPath: string },
      hre
    ) => {
      const { IgnitionModuleSerializer, batches } = await import(
        "@nomicfoundation/ignition-core"
      );

      const { loadModule } = await import("./load-module");
      const { open } = await import("./utils/open");
      const { writeVisualization } = await import(
        "./visualization/write-visualization"
      );

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

      const batchInfo = batches(userModule);

      await writeVisualization(
        { module: serializedIgnitionModule, batches: batchInfo },
        {
          cacheDir: hre.config.paths.cache,
        }
      );

      if (!noOpen) {
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

ignitionScope
  .task("status")
  .addParam("id", "The id of the deployment to show")
  .setDescription("Show the current status of a deployment")
  .setAction(async ({ id }: { id: string }, hre) => {
    const { status } = await import("@nomicfoundation/ignition-core");

    const deploymentDir = path.join(
      hre.config.paths.ignition,
      "deployments",
      id
    );

    let statusResult: StatusResult;
    try {
      statusResult = await status(deploymentDir);
    } catch (e) {
      if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
        throw new NomicLabsHardhatPluginError("hardhat-ignition", e.message);
      }

      throw e;
    }

    if (statusResult.started.length > 0) {
      console.log("");
      console.log(
        chalk.bold(
          `⛔ Deployment ${id} has not fully completed, there are futures have started but not finished`
        )
      );
      console.log("");

      for (const futureId of Object.values(statusResult.started)) {
        console.log(` - ${futureId}`);
      }

      console.log("");
      return;
    }

    if (
      statusResult.timedOut.length > 0 ||
      statusResult.failed.length > 0 ||
      statusResult.held.length > 0
    ) {
      console.log("");
      console.log(chalk.bold(toErrorResultHeading(id, statusResult)));
      console.log("");

      if (statusResult.timedOut.length > 0) {
        console.log(chalk.yellow("There are timed-out futures:"));
        console.log("");

        for (const { futureId } of Object.values(statusResult.timedOut)) {
          console.log(` - ${futureId}`);
        }

        console.log("");
      }

      if (statusResult.failed.length > 0) {
        console.log(chalk.red("There are failed futures"));
        console.log("");

        for (const { futureId, networkInteractionId, error } of Object.values(
          statusResult.failed
        )) {
          console.log(` - ${futureId}/${networkInteractionId}: ${error}`);
        }

        console.log("");
      }

      if (statusResult.held.length > 0) {
        console.log(chalk.yellow("There are futures that the strategy held:"));
        console.log("");

        for (const { futureId, heldId, reason } of Object.values(
          statusResult.held
        )) {
          console.log(` - ${futureId}/${heldId}: ${reason}`);
        }

        console.log("");
      }

      return;
    }

    console.log("");
    console.log(chalk.bold(`🚀 Deployment ${id} Complete `));
    console.log("");

    if (Object.values(statusResult.contracts).length === 0) {
      console.log(chalk.italic("No contracts were deployed"));
    } else {
      console.log("Deployed Addresses");
      console.log("");

      for (const contract of Object.values(statusResult.contracts)) {
        console.log(`${contract.id} - ${contract.address}`);
      }
    }
  });

ignitionScope
  .task("wipe")
  .addParam("id", "The id of the deployment that has the future to wipe")
  .addParam("future", "The id of the future within the deploment to wipe")
  .setDescription("Reset a deployment's future to allow rerunning")
  .setAction(
    async (
      {
        deployment: deploymentId,
        future: futureId,
      }: { deployment: string; future: string },
      hre
    ) => {
      const { wipe } = await import("@nomicfoundation/ignition-core");

      const { HardhatArtifactResolver } = await import(
        "./hardhat-artifact-resolver"
      );

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

function toErrorResultHeading(
  deploymentId: string,
  statusResult: StatusResult
): string {
  const didTimeout = statusResult.timedOut.length > 0;
  const didFailed = statusResult.failed.length > 0;
  const didHeld = statusResult.held.length > 0;

  let reasons = "";
  if (didTimeout && didFailed && didHeld) {
    reasons = "timeouts, failures and holds";
  } else if (didTimeout && didFailed) {
    reasons = "timeouts and failures";
  } else if (didFailed && didHeld) {
    reasons = "failures and holds";
  } else if (didTimeout && didHeld) {
    reasons = "timeouts and holds";
  } else if (didTimeout) {
    reasons = "timeouts";
  } else if (didFailed) {
    reasons = "failures";
  } else if (didHeld) {
    reasons = "holds";
  }

  return chalk.bold(
    `⛔ Deployment ${deploymentId} did ${chalk.bold(
      "not"
    )} complete as there were ${reasons}`
  );
}
