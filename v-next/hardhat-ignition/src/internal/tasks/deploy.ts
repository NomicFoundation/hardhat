import type {
  DeploymentParameters,
  DeploymentResult,
} from "@nomicfoundation/ignition-core";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { NewTaskActionFunction } from "hardhat/types/tasks";

import path from "node:path";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  ensureDir,
  exists,
  readdir,
  readJsonFile,
  remove,
  writeJsonFile,
} from "@nomicfoundation/hardhat-utils/fs";
import { deploy } from "@nomicfoundation/ignition-core";
import chalk from "chalk";
import Prompt from "prompts";

import { HardhatArtifactResolver } from "../../helpers/hardhat-artifact-resolver.js";
import { PrettyEventHandler } from "../../helpers/pretty-event-handler.js";
import { readDeploymentParameters } from "../../helpers/read-deployment-parameters.js";
import { resolveDeploymentId } from "../../helpers/resolve-deployment-id.js";
import { bigintReviver } from "../utils/bigintReviver.js";
import { loadModule } from "../utils/load-module.js";
import { verifyArtifactsVersion } from "../utils/verifyArtifactsVersion.js";

interface TaskDeployArguments {
  modulePath: string;
  parameters?: string;
  deploymentId?: string;
  defaultSender?: string;
  strategy: string;
  reset: boolean;
  verify: boolean;
  writeLocalhostDeployment: boolean;
}

const taskDeploy: NewTaskActionFunction<TaskDeployArguments> = async (
  {
    modulePath,
    parameters: parametersInput,
    deploymentId: givenDeploymentId,
    defaultSender,
    reset,
    verify,
    strategy: strategyName,
    writeLocalhostDeployment,
  },
  hre: HardhatRuntimeEnvironment,
): Promise<DeploymentResult | null> => {
  const connection = await hre.network.connect();

  const chainId = Number(
    await connection.provider.request({
      method: "eth_chainId",
    }),
  );

  const deploymentId = resolveDeploymentId(
    givenDeploymentId === undefined || givenDeploymentId === ""
      ? undefined
      : givenDeploymentId,
    chainId,
  );

  const deploymentDir =
    connection.networkConfig.type === "edr" && !writeLocalhostDeployment
      ? undefined
      : path.join(hre.config.paths.ignition, "deployments", deploymentId);

  await verifyArtifactsVersion(deploymentDir);

  if (chainId !== 31337) {
    if (process.env.HARDHAT_IGNITION_CONFIRM_DEPLOYMENT === undefined) {
      const prompt = await Prompt({
        type: "confirm",
        name: "networkConfirmation",
        message: `Confirm deploy to network ${connection.networkName} (${chainId})?`,
        initial: false,
      });

      if (prompt.networkConfirmation !== true) {
        console.log("Deploy cancelled");
        process.exitCode = 1;
        return null;
      }
    }

    if (reset && process.env.HARDHAT_IGNITION_CONFIRM_RESET === undefined) {
      const resetPrompt = await Prompt({
        type: "confirm",
        name: "resetConfirmation",
        message: `Confirm reset of deployment "${deploymentId}" on chain ${chainId}?`,
        initial: false,
      });

      if (resetPrompt.resetConfirmation !== true) {
        console.log("Deploy cancelled");
        process.exitCode = 1;
        return null;
      }
    }
  } else if (deploymentDir !== undefined) {
    // since we're on hardhat-network
    // check for a previous run of this deploymentId and compare instanceIds
    // if they're different, wipe deployment state
    const instanceFilePath = path.join(
      hre.config.paths.cache,
      ".hardhat-network-instances.json",
    );
    const instanceFileExists = await exists(instanceFilePath);

    const instanceFile: {
      [deploymentId: string]: string;
    } = instanceFileExists ? await readJsonFile(instanceFilePath) : {};

    const metadata = (await connection.provider.request({
      method: "hardhat_metadata",
    })) as { instanceId: string };

    if (instanceFile[deploymentId] !== metadata.instanceId) {
      await remove(deploymentDir);
    }

    // save current instanceId to instanceFile for future runs
    instanceFile[deploymentId] = metadata.instanceId;
    await ensureDir(path.dirname(instanceFilePath));
    await writeJsonFile(instanceFilePath, instanceFile);
  }

  if (reset) {
    if (deploymentDir === undefined) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.INTERNAL.CANNOT_RESET_EPHEMERAL_NETWORK,
      );
    } else {
      await remove(deploymentDir);
    }
  }

  if (strategyName !== "basic" && strategyName !== "create2") {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.STRATEGIES.UNKNOWN_STRATEGY,
      {
        strategyName,
      },
    );
  }

  await hre.tasks.getTask("compile").run({
    quiet: true,
    defaultBuildProfile: "production",
  });

  const userModule = await loadModule(hre.config.paths.ignition, modulePath);

  if (userModule === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.INTERNAL.NO_MODULES_FOUND,
    );
  }

  let parameters: DeploymentParameters | undefined;
  if (parametersInput === undefined) {
    parameters = await resolveParametersFromModuleName(
      userModule.id,
      hre.config.paths.ignition,
    );
  } else if (
    parametersInput.endsWith(".json") ||
    parametersInput.endsWith(".json5")
  ) {
    parameters = await resolveParametersFromFileName(parametersInput);
  } else {
    parameters = await resolveParametersString(parametersInput);
  }

  const accounts = (await connection.provider.request({
    method: "eth_accounts",
  })) as string[];

  const artifactResolver = new HardhatArtifactResolver(hre.artifacts);

  const executionEventListener = new PrettyEventHandler();

  const strategyConfig = hre.config.ignition.strategyConfig?.[strategyName];

  const result = await deploy({
    config: hre.config.ignition,
    provider: connection.provider,
    executionEventListener,
    artifactResolver,
    deploymentDir,
    ignitionModule: userModule,
    deploymentParameters: parameters ?? {},
    accounts,
    defaultSender:
      defaultSender === undefined || defaultSender === ""
        ? undefined
        : defaultSender,
    strategy: strategyName,
    strategyConfig,
    maxFeePerGasLimit:
      hre.config.networks[connection.networkName]?.ignition.maxFeePerGasLimit,
    maxPriorityFeePerGas:
      hre.config.networks[connection.networkName]?.ignition
        .maxPriorityFeePerGas,
    gasPrice: hre.config.networks[connection.networkName]?.ignition.gasPrice,
    disableFeeBumping:
      hre.config.ignition.disableFeeBumping ??
      hre.config.networks[connection.networkName]?.ignition.disableFeeBumping,
  });

  if (result.type === "SUCCESSFUL_DEPLOYMENT" && verify) {
    console.log("");
    console.log(chalk.bold("Verifying deployed contracts"));
    console.log("");

    await hre.tasks.getTask(["ignition", "verify"]).run({ deploymentId });
  }

  if (result.type !== "SUCCESSFUL_DEPLOYMENT") {
    process.exitCode = 1;
  }

  return result;
};

async function resolveParametersFromModuleName(
  moduleName: string,
  ignitionPath: string,
): Promise<DeploymentParameters | undefined> {
  const files = await readdir(ignitionPath);
  const configFilename = `${moduleName}.config.json`;

  return files.includes(configFilename)
    ? readDeploymentParameters(path.resolve(ignitionPath, configFilename))
    : undefined;
}

async function resolveParametersFromFileName(
  fileName: string,
): Promise<DeploymentParameters> {
  const filepath = path.resolve(process.cwd(), fileName);

  return readDeploymentParameters(filepath);
}

async function resolveParametersString(
  paramString: string,
): Promise<DeploymentParameters> {
  try {
    const {
      default: { parse },
    } = await import("json5");

    return await parse(paramString, bigintReviver);
  } catch (e) {
    if (HardhatError.isHardhatError(e)) {
      throw e;
    }

    if (e instanceof Error) {
      throw new HardhatError(
        HardhatError.ERRORS.IGNITION.INTERNAL.FAILED_TO_PARSE_JSON,
        e,
      );
    }

    throw e;
  }
}

export default taskDeploy;
