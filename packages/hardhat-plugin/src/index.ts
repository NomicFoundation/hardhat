import "@nomiclabs/hardhat-ethers";
import {
  Module,
  ModuleDict,
  Providers,
  ModuleParams,
} from "@ignored/ignition-core";
import { BigNumber } from "ethers";
import fs from "fs-extra";
import { extendConfig, extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import path from "path";

import { ConfigWrapper } from "./ConfigWrapper";
import { IgnitionWrapper } from "./ignition-wrapper";
import { Renderer } from "./plan";
import { loadUserModules, loadAllUserModules } from "./user-modules";
import "./type-extensions";

export { buildSubgraph, buildModule } from "@ignored/ignition-core";

export interface IgnitionConfig {
  maxRetries: number;
  gasIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  awaitEventDuration: number;
}

/* ignition config defaults */
const IGNITION_DIR = "ignition";
const DEPLOYMENTS_DIR = "deployments";
const MAX_RETRIES = 4;
const GAS_INCREMENT_PER_RETRY = null;
const POLLING_INTERVAL = 300;
const AWAIT_EVENT_DURATION = 30000; // ms

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
    awaitEventDuration:
      userIgnitionConfig.awaitEventDuration ?? AWAIT_EVENT_DURATION,
  };
});

/**
 * Add an `ignition` object to the HRE.
 */
extendEnvironment((hre) => {
  const providers: Providers = {
    artifacts: {
      getArtifact: (name: string) => hre.artifacts.readArtifact(name),
      hasArtifact: (name: string) => hre.artifacts.artifactExists(name),
    },
    gasProvider: {
      estimateGasLimit: async (tx: any) => {
        const gasLimit = await hre.ethers.provider.estimateGas(tx);

        // return 1.5x estimated gas
        return gasLimit.mul(15).div(10);
      },
      estimateGasPrice: async () => {
        return hre.ethers.provider.getGasPrice();
      },
    },
    ethereumProvider: hre.network.provider,
    signers: {
      getDefaultSigner: async () => {
        const [signer] = await hre.ethers.getSigners();
        return signer;
      },
    },
    transactions: {
      isConfirmed: async (txHash: any) => {
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
        if (receipt === null) {
          return false;
        }

        return receipt.blockNumber <= blockNumber;
      },
      isMined: async (txHash: any) => {
        const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
        return receipt !== null;
      },
    },
    config: new ConfigWrapper(),
  };

  hre.ignition = lazyObject(() => {
    const isHardhatNetwork = hre.network.name === "hardhat";

    const pathToJournal = isHardhatNetwork
      ? undefined
      : path.resolve(hre.config.paths.root, "ignition-journal.json");

    const txPollingInterval = isHardhatNetwork ? 100 : 5000;

    return new IgnitionWrapper(providers, hre.ethers, {
      ...hre.config.ignition,
      pathToJournal,
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

      await hre.ignition.deploy(userModule, { parameters, ui: true });
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

function resolveParametersString(paramString: string): ModuleParams {
  try {
    return JSON.parse(paramString);
  } catch {
    console.warn(`Could not parse JSON parameters`);
    process.exit(0);
  }
}
