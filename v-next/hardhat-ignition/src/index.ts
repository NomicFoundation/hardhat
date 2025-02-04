import "@nomicfoundation/hardhat-verify";
import { Etherscan } from "@nomicfoundation/hardhat-verify/etherscan";
import {
  DeploymentParameters,
  IgnitionError,
  ListTransactionsResult,
  StatusResult,
} from "@ignored/hardhat-vnext-ignition-core";
import debug from "debug";
import { ensureDir, pathExists, readdirSync, rm, writeJSON } from "fs-extra";
import { extendConfig, extendEnvironment, scope } from "hardhat/config";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { parse as json5Parse } from "json5";
import path from "path";

import "./type-extensions";
import { calculateDeploymentStatusDisplay } from "./ui/helpers/calculate-deployment-status-display";
import { bigintReviver } from "./utils/bigintReviver";
import { getApiKeyAndUrls } from "./utils/getApiKeyAndUrls";
import { readDeploymentParameters } from "./utils/read-deployment-parameters";
import { resolveDeploymentId } from "./utils/resolve-deployment-id";
import { shouldBeHardhatPluginError } from "./utils/shouldBeHardhatPluginError";
import { verifyEtherscanContract } from "./utils/verifyEtherscanContract";

/* ignition config defaults */
const IGNITION_DIR = "ignition";

const ignitionScope = scope(
  "ignition",
  "Deploy your smart contracts using Hardhat Ignition"
);

const log = debug("hardhat:ignition");

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

  Object.keys(config.networks).forEach((networkName) => {
    const userNetworkConfig = userConfig.networks?.[networkName] ?? {};

    config.networks[networkName].ignition = {
      maxFeePerGasLimit: userNetworkConfig.ignition?.maxFeePerGasLimit,
      maxPriorityFeePerGas: userNetworkConfig.ignition?.maxPriorityFeePerGas,
      gasPrice: userNetworkConfig.ignition?.gasPrice,
      disableFeeBumping: userNetworkConfig.ignition?.disableFeeBumping,
      explorerUrl: userNetworkConfig.ignition?.explorerUrl,
    };
  });

  /* setup core configs */
  const userIgnitionConfig = userConfig.ignition ?? {};

  config.ignition = userIgnitionConfig;
});

/**
 * Add an `ignition` stub to throw
 */
extendEnvironment((hre) => {
  if ((hre as any).ignition === undefined) {
    (hre as any).ignition = {
      type: "stub",
      deploy: () => {
        throw new NomicLabsHardhatPluginError(
          "hardhat-ignition",
          "Please install either `@nomicfoundation/hardhat-ignition-viem` or `@nomicfoundation/hardhat-ignition-ethers` to use Ignition in your Hardhat tests"
        );
      },
    };
  }
});

ignitionScope
  .task("deploy")
  .addPositionalParam("modulePath", "The path to the module file to deploy")
  .addOptionalParam(
    "parameters",
    "A relative path to a JSON file to use for the module parameters"
  )
  .addOptionalParam("deploymentId", "Set the id of the deployment")
  .addOptionalParam(
    "defaultSender",
    "Set the default sender for the deployment"
  )
  .addOptionalParam("strategy", "Set the deployment strategy to use", "basic")
  .addFlag("reset", "Wipes the existing deployment state before deploying")
  .addFlag("verify", "Verify the deployment on Etherscan")
  .addFlag(
    "writeLocalhostDeployment",
    "Write deployment information to disk when deploying to the in-memory network"
  )
  .setDescription("Deploy a module to the specified network")
  .setAction(
    async (
      {
        modulePath,
        parameters: parametersInput,
        deploymentId: givenDeploymentId,
        defaultSender,
        reset,
        verify,
        strategy: strategyName,
        writeLocalhostDeployment,
      }: {
        modulePath: string;
        parameters?: string;
        deploymentId: string | undefined;
        defaultSender: string | undefined;
        reset: boolean;
        verify: boolean;
        strategy: string;
        writeLocalhostDeployment: boolean;
      },
      hre
    ) => {
      const { default: chalk } = await import("chalk");
      const { default: Prompt } = await import("prompts");
      const { deploy } = await import("@nomicfoundation/ignition-core");

      const { HardhatArtifactResolver } = await import(
        "./hardhat-artifact-resolver"
      );
      const { loadModule } = await import("./utils/load-module");
      const { PrettyEventHandler } = await import("./ui/pretty-event-handler");

      if (verify) {
        if (
          hre.config.etherscan === undefined ||
          hre.config.etherscan.apiKey === undefined ||
          hre.config.etherscan.apiKey === ""
        ) {
          throw new NomicLabsHardhatPluginError(
            "@nomicfoundation/hardhat-ignition",
            "No etherscan API key configured"
          );
        }
      }

      const chainId = Number(
        await hre.network.provider.request({
          method: "eth_chainId",
        })
      );

      const deploymentId = resolveDeploymentId(givenDeploymentId, chainId);

      const deploymentDir =
        hre.network.name === "hardhat" && !writeLocalhostDeployment
          ? undefined
          : path.join(hre.config.paths.ignition, "deployments", deploymentId);
      if (chainId !== 31337) {
        if (process.env.HARDHAT_IGNITION_CONFIRM_DEPLOYMENT === undefined) {
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
          ".hardhat-network-instances.json"
        );
        const instanceFileExists = await pathExists(instanceFilePath);

        const instanceFile: {
          [deploymentId: string]: string;
        } = instanceFileExists ? require(instanceFilePath) : {};

        const metadata = (await hre.network.provider.request({
          method: "hardhat_metadata",
        })) as { instanceId: string };

        if (instanceFile[deploymentId] !== metadata.instanceId) {
          await rm(deploymentDir, { recursive: true, force: true });
        }

        // save current instanceId to instanceFile for future runs
        instanceFile[deploymentId] = metadata.instanceId;
        await ensureDir(path.dirname(instanceFilePath));
        await writeJSON(instanceFilePath, instanceFile, { spaces: 2 });
      }

      if (reset) {
        if (deploymentDir === undefined) {
          throw new NomicLabsHardhatPluginError(
            "@nomicfoundation/hardhat-ignition",
            "Deploy cancelled: Cannot reset deployment on ephemeral Hardhat network"
          );
        } else {
          await rm(deploymentDir, { recursive: true, force: true });
        }
      }

      if (strategyName !== "basic" && strategyName !== "create2") {
        throw new NomicLabsHardhatPluginError(
          "hardhat-ignition",
          "Invalid strategy name, must be either 'basic' or 'create2'"
        );
      }

      await hre.run("compile", { quiet: true });

      const userModule = loadModule(hre.config.paths.ignition, modulePath);

      if (userModule === undefined) {
        throw new NomicLabsHardhatPluginError(
          "@nomicfoundation/hardhat-ignition",
          "No Ignition modules found"
        );
      }

      let parameters: DeploymentParameters | undefined;
      if (parametersInput === undefined) {
        parameters = await resolveParametersFromModuleName(
          userModule.id,
          hre.config.paths.ignition
        );
      } else if (
        parametersInput.endsWith(".json") ||
        parametersInput.endsWith(".json5")
      ) {
        parameters = await resolveParametersFromFileName(parametersInput);
      } else {
        parameters = resolveParametersString(parametersInput);
      }

      const accounts = (await hre.network.provider.request({
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
          await hre.network.provider.send("hardhat_setLedgerOutputEnabled", [
            false,
          ]);

          hre.network.provider.once("connection_start", ledgerConnectionStart);
          hre.network.provider.once(
            "connection_success",
            ledgerConnectionSuccess
          );
          hre.network.provider.once(
            "connection_failure",
            ledgerConnectionFailure
          );
          hre.network.provider.on(
            "confirmation_start",
            ledgerConfirmationStart
          );
          hre.network.provider.on(
            "confirmation_success",
            ledgerConfirmationSuccess
          );
          hre.network.provider.on(
            "confirmation_failure",
            ledgerConfirmationFailure
          );
        } catch (error) {
          log(error);
        }

        const result = await deploy({
          config: hre.config.ignition,
          provider: hre.network.provider,
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
            hre.config.networks[hre.network.name]?.ignition.maxFeePerGasLimit,
          maxPriorityFeePerGas:
            hre.config.networks[hre.network.name]?.ignition
              .maxPriorityFeePerGas,
          gasPrice: hre.config.networks[hre.network.name]?.ignition.gasPrice,
          disableFeeBumping:
            hre.config.ignition.disableFeeBumping ??
            hre.config.networks[hre.network.name]?.ignition.disableFeeBumping,
        });

        try {
          await hre.network.provider.send("hardhat_setLedgerOutputEnabled", [
            true,
          ]);

          hre.network.provider.off("connection_start", ledgerConnectionStart);
          hre.network.provider.off(
            "connection_success",
            ledgerConnectionSuccess
          );
          hre.network.provider.off(
            "connection_failure",
            ledgerConnectionFailure
          );
          hre.network.provider.off(
            "confirmation_start",
            ledgerConfirmationStart
          );
          hre.network.provider.off(
            "confirmation_success",
            ledgerConfirmationSuccess
          );
          hre.network.provider.off(
            "confirmation_failure",
            ledgerConfirmationFailure
          );
        } catch (error) {
          log(error);
        }

        if (result.type === "SUCCESSFUL_DEPLOYMENT" && verify) {
          console.log("");
          console.log(chalk.bold("Verifying deployed contracts"));
          console.log("");

          await hre.run(
            { scope: "ignition", task: "verify" },
            { deploymentId }
          );
        }

        if (result.type !== "SUCCESSFUL_DEPLOYMENT") {
          process.exitCode = 1;
        }
      } catch (e) {
        if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
          throw new NomicLabsHardhatPluginError(
            "hardhat-ignition",
            e.message,
            e
          );
        }

        throw e;
      }
    }
  );

ignitionScope
  .task("visualize")
  .addFlag("noOpen", "Disables opening report in browser")
  .addPositionalParam("modulePath", "The path to the module file to visualize")
  .setDescription("Visualize a module as an HTML report")
  .setAction(
    async (
      { noOpen = false, modulePath }: { noOpen: boolean; modulePath: string },
      hre
    ) => {
      const { IgnitionModuleSerializer, batches } = await import(
        "@nomicfoundation/ignition-core"
      );

      const { loadModule } = await import("./utils/load-module");
      const { open } = await import("./utils/open");

      const { writeVisualization } = await import(
        "./visualization/write-visualization"
      );

      await hre.run("compile", { quiet: true });

      const userModule = loadModule(hre.config.paths.ignition, modulePath);

      if (userModule === undefined) {
        throw new NomicLabsHardhatPluginError(
          "@nomicfoundation/hardhat-ignition",
          "No Ignition modules found"
        );
      } else {
        try {
          const serializedIgnitionModule =
            IgnitionModuleSerializer.serialize(userModule);

          const batchInfo = batches(userModule);

          await writeVisualization(
            { module: serializedIgnitionModule, batches: batchInfo },
            {
              cacheDir: hre.config.paths.cache,
            }
          );
        } catch (e) {
          if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
            throw new NomicLabsHardhatPluginError(
              "hardhat-ignition",
              e.message,
              e
            );
          }

          throw e;
        }
      }

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
  .addPositionalParam("deploymentId", "The id of the deployment to show")
  .setDescription("Show the current status of a deployment")
  .setAction(async ({ deploymentId }: { deploymentId: string }, hre) => {
    const { status } = await import("@nomicfoundation/ignition-core");

    const { HardhatArtifactResolver } = await import(
      "./hardhat-artifact-resolver"
    );

    const deploymentDir = path.join(
      hre.config.paths.ignition,
      "deployments",
      deploymentId
    );

    const artifactResolver = new HardhatArtifactResolver(hre);

    let statusResult: StatusResult;
    try {
      statusResult = await status(deploymentDir, artifactResolver);
    } catch (e) {
      if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
        throw new NomicLabsHardhatPluginError("hardhat-ignition", e.message, e);
      }

      throw e;
    }

    console.log(calculateDeploymentStatusDisplay(deploymentId, statusResult));
  });

ignitionScope
  .task("deployments")
  .setDescription("List all deployment IDs")
  .setAction(async (_, hre) => {
    const { listDeployments } = await import("@nomicfoundation/ignition-core");

    const deploymentDir = path.join(hre.config.paths.ignition, "deployments");

    try {
      const deployments = await listDeployments(deploymentDir);

      for (const deploymentId of deployments) {
        console.log(deploymentId);
      }
    } catch (e) {
      if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
        throw new NomicLabsHardhatPluginError("hardhat-ignition", e.message, e);
      }

      throw e;
    }
  });

ignitionScope
  .task("wipe")
  .addPositionalParam(
    "deploymentId",
    "The id of the deployment with the future to wipe"
  )
  .addPositionalParam("futureId", "The id of the future to wipe")
  .setDescription("Reset a deployment's future to allow rerunning")
  .setAction(
    async (
      { deploymentId, futureId }: { deploymentId: string; futureId: string },
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

      try {
        await wipe(deploymentDir, new HardhatArtifactResolver(hre), futureId);
      } catch (e) {
        if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
          throw new NomicLabsHardhatPluginError(
            "hardhat-ignition",
            e.message,
            e
          );
        }

        throw e;
      }

      console.log(`${futureId} state has been cleared`);
    }
  );

ignitionScope
  .task("verify")
  .addFlag(
    "includeUnrelatedContracts",
    "Include all compiled contracts in the verification"
  )
  .addPositionalParam("deploymentId", "The id of the deployment to verify")
  .setDescription(
    "Verify contracts from a deployment against the configured block explorers"
  )
  .setAction(
    async (
      {
        deploymentId,
        includeUnrelatedContracts = false,
      }: { deploymentId: string; includeUnrelatedContracts: boolean },
      hre
    ) => {
      const { getVerificationInformation } = await import(
        "@nomicfoundation/ignition-core"
      );

      const deploymentDir = path.join(
        hre.config.paths.ignition,
        "deployments",
        deploymentId
      );

      if (
        hre.config.etherscan === undefined ||
        hre.config.etherscan.apiKey === undefined ||
        hre.config.etherscan.apiKey === ""
      ) {
        throw new NomicLabsHardhatPluginError(
          "@nomicfoundation/hardhat-ignition",
          "No etherscan API key configured"
        );
      }

      try {
        for await (const [
          chainConfig,
          contractInfo,
        ] of getVerificationInformation(
          deploymentDir,
          hre.config.etherscan.customChains,
          includeUnrelatedContracts
        )) {
          if (chainConfig === null) {
            console.log(
              `Could not resolve contract artifacts for contract "${contractInfo}". Skipping verification.`
            );
            console.log("");
            continue;
          }

          const apiKeyAndUrls = getApiKeyAndUrls(
            hre.config.etherscan.apiKey,
            chainConfig
          );

          const instance = new Etherscan(...apiKeyAndUrls);

          console.log(
            `Verifying contract "${contractInfo.name}" for network ${chainConfig.network}...`
          );

          const result = await verifyEtherscanContract(instance, contractInfo);

          if (result.type === "success") {
            console.log(
              `Successfully verified contract "${contractInfo.name}" for network ${chainConfig.network}:\n  - ${result.contractURL}`
            );
            console.log("");
          } else {
            if (/already verified/gi.test(result.reason.message)) {
              const contractURL = instance.getContractUrl(contractInfo.address);
              console.log(
                `Contract ${contractInfo.name} already verified on network ${chainConfig.network}:\n  - ${contractURL}`
              );
              console.log("");
              continue;
            } else {
              if (!includeUnrelatedContracts) {
                throw new NomicLabsHardhatPluginError(
                  "hardhat-ignition",
                  `Verification failed. Please run \`hardhat ignition verify ${deploymentId} --include-unrelated-contracts\` to attempt verifying all contracts.`
                );
              } else {
                throw new NomicLabsHardhatPluginError(
                  "hardhat-ignition",
                  result.reason.message
                );
              }
            }
          }
        }
      } catch (e) {
        if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
          throw new NomicLabsHardhatPluginError(
            "hardhat-ignition",
            e.message,
            e
          );
        }

        throw e;
      }
    }
  );

ignitionScope
  .task("transactions")
  .addPositionalParam(
    "deploymentId",
    "The id of the deployment to show transactions for"
  )
  .setDescription("Show all transactions for a given deployment")
  .setAction(async ({ deploymentId }: { deploymentId: string }, hre) => {
    const { listTransactions } = await import("@nomicfoundation/ignition-core");

    const { HardhatArtifactResolver } = await import(
      "./hardhat-artifact-resolver"
    );
    const { calculateListTransactionsDisplay } = await import(
      "./ui/helpers/calculate-list-transactions-display"
    );

    const deploymentDir = path.join(
      hre.config.paths.ignition,
      "deployments",
      deploymentId
    );

    const artifactResolver = new HardhatArtifactResolver(hre);

    let listTransactionsResult: ListTransactionsResult;
    try {
      listTransactionsResult = await listTransactions(
        deploymentDir,
        artifactResolver
      );
    } catch (e) {
      if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
        throw new NomicLabsHardhatPluginError("hardhat-ignition", e.message, e);
      }

      throw e;
    }

    console.log(
      calculateListTransactionsDisplay(
        deploymentId,
        listTransactionsResult,
        hre.config.networks[hre.network.name]?.ignition?.explorerUrl
      )
    );
  });

async function resolveParametersFromModuleName(
  moduleName: string,
  ignitionPath: string
): Promise<DeploymentParameters | undefined> {
  const files = readdirSync(ignitionPath);
  const configFilename = `${moduleName}.config.json`;

  return files.includes(configFilename)
    ? readDeploymentParameters(path.resolve(ignitionPath, configFilename))
    : undefined;
}

async function resolveParametersFromFileName(
  fileName: string
): Promise<DeploymentParameters> {
  const filepath = path.resolve(process.cwd(), fileName);

  return readDeploymentParameters(filepath);
}

function resolveParametersString(paramString: string): DeploymentParameters {
  try {
    return json5Parse(paramString, bigintReviver);
  } catch (e) {
    if (e instanceof NomicLabsHardhatPluginError) {
      throw e;
    }

    if (e instanceof Error) {
      throw new NomicLabsHardhatPluginError(
        "@nomicfoundation/hardhat-ignition",
        "Could not parse JSON parameters",
        e
      );
    }

    throw e;
  }
}
