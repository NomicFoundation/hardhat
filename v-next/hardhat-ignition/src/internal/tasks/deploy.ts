import type { HardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/types/hre";
import type { NewTaskActionFunction } from "@ignored/hardhat-vnext/types/tasks";
import type { DeploymentParameters } from "@ignored/hardhat-vnext-ignition-core";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import { deploy, IgnitionError } from "@ignored/hardhat-vnext-ignition-core";
import {
  ensureDir,
  exists,
  readdir,
  remove,
  writeJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";
import debug from "debug";
import Prompt from "prompts";

import { HardhatArtifactResolver } from "../../hardhat-artifact-resolver.js";
import { PrettyEventHandler } from "../../ui/pretty-event-handler.js";
import { bigintReviver } from "../../utils/bigintReviver.js";
import { loadModule } from "../../utils/load-module.js";
import { readDeploymentParameters } from "../../utils/read-deployment-parameters.js";
import { resolveDeploymentId } from "../../utils/resolve-deployment-id.js";
import { shouldBeHardhatPluginError } from "../../utils/shouldBeHardhatPluginError.js";

interface TaskDeployArguments {
  modulePath: string;
  parameters: string;
  deploymentId: string;
  defaultSender: string;
  strategy: string;
  reset: boolean;
  verify: boolean;
  writeLocalhostDeployment: boolean;
}

const log = debug("hardhat:ignition");

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
): Promise<void> => {
  if (verify) {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message:
        "Verifying deployments is not available yet. It will be available in a future version of the Harhdat 3 Alpha",
    });

    // TODO: Bring back with the port of hardhat-verify
    // if (
    //   hre.config.etherscan === undefined ||
    //   hre.config.etherscan.apiKey === undefined ||
    //   hre.config.etherscan.apiKey === ""
    // ) {
    //   throw new HardhatError(
    //     HardhatError.ERRORS.IGNITION.ETHERSCAN_API_KEY_NOT_CONFIGURED,
    //   );
    // }
  }

  const connection = await hre.network.connect();

  const chainId = Number(
    await connection.provider.request({
      method: "eth_chainId",
    }),
  );

  const deploymentId = resolveDeploymentId(
    givenDeploymentId === "" ? undefined : givenDeploymentId,
    chainId,
  );

  const deploymentDir =
    connection.networkName === "hardhat" && !writeLocalhostDeployment
      ? undefined
      : path.join(hre.config.paths.ignition, "deployments", deploymentId);
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
        return;
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
        return;
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
    } = instanceFileExists ? require(instanceFilePath) : {};

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
        HardhatError.ERRORS.IGNITION.CANNOT_RESET_EPHEMERAL_NETWORK,
      );
    } else {
      await remove(deploymentDir);
    }
  }

  if (strategyName !== "basic" && strategyName !== "create2") {
    throw new HardhatError(HardhatError.ERRORS.IGNITION.UNKNOWN_STRATEGY);
  }

  await hre.tasks.getTask("compile").run({ quiet: true });

  const userModule = await loadModule(hre.config.paths.ignition, modulePath);

  if (userModule === undefined) {
    throw new HardhatError(HardhatError.ERRORS.IGNITION.NO_MODULES_FOUND);
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

  const artifactResolver = new HardhatArtifactResolver(hre);

  const executionEventListener = new PrettyEventHandler();

  const strategyConfig = hre.config.ignition.strategyConfig?.[strategyName];

  try {
    const ledgerConnectionStart = () =>
      executionEventListener.ledgerConnectionStart();
    const ledgerConnectionSuccess = () =>
      executionEventListener.ledgerConnectionSuccess();
    const ledgerConnectionFailure = () =>
      executionEventListener.ledgerConnectionFailure();
    const ledgerConfirmationStart = () =>
      executionEventListener.ledgerConfirmationStart();
    const ledgerConfirmationSuccess = () =>
      executionEventListener.ledgerConfirmationSuccess();
    const ledgerConfirmationFailure = () =>
      executionEventListener.ledgerConfirmationFailure();

    try {
      await connection.provider.send("hardhat_setLedgerOutputEnabled", [false]);

      connection.provider.once("connection_start", ledgerConnectionStart);
      connection.provider.once("connection_success", ledgerConnectionSuccess);
      connection.provider.once("connection_failure", ledgerConnectionFailure);
      connection.provider.on("confirmation_start", ledgerConfirmationStart);
      connection.provider.on("confirmation_success", ledgerConfirmationSuccess);
      connection.provider.on("confirmation_failure", ledgerConfirmationFailure);
    } catch (error) {
      log(error);
    }

    const result = await deploy({
      config: hre.config.ignition,
      provider: connection.provider,
      executionEventListener,
      artifactResolver,
      deploymentDir,
      ignitionModule: userModule,
      deploymentParameters: parameters ?? {},
      accounts,
      defaultSender,
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

    try {
      await connection.provider.send("hardhat_setLedgerOutputEnabled", [true]);

      connection.provider.off("connection_start", ledgerConnectionStart);
      connection.provider.off("connection_success", ledgerConnectionSuccess);
      connection.provider.off("connection_failure", ledgerConnectionFailure);
      connection.provider.off("confirmation_start", ledgerConfirmationStart);
      connection.provider.off(
        "confirmation_success",
        ledgerConfirmationSuccess,
      );
      connection.provider.off(
        "confirmation_failure",
        ledgerConfirmationFailure,
      );
    } catch (error) {
      log(error);
    }

    // TODO: Bring back with the port of hardhat-verify
    // if (result.type === "SUCCESSFUL_DEPLOYMENT" && verify) {
    //   console.log("");
    //   console.log(chalk.bold("Verifying deployed contracts"));
    //   console.log("");

    //   await hre.run({ scope: "ignition", task: "verify" }, { deploymentId });
    // }

    if (result.type !== "SUCCESSFUL_DEPLOYMENT") {
      process.exitCode = 1;
    }
  } catch (e) {
    if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
      throw new HardhatError(HardhatError.ERRORS.IGNITION.INTERNAL_ERROR, e);
    }

    throw e;
  }
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
        HardhatError.ERRORS.IGNITION.FAILED_TO_PARSE_JSON,
        e,
      );
    }

    throw e;
  }
}

export default taskDeploy;
