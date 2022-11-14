import "@nomiclabs/hardhat-ethers";
import { Module, ModuleDict, Providers } from "@ignored/ignition-core";
import { BigNumber } from "ethers";
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
}

/* ignition config defaults */
const IGNITION_DIR = "ignition";
const DEPLOYMENTS_DIR = "deployments";
const MAX_RETRIES = 4;
const GAS_INCREMENT_PER_RETRY = null;

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
      ui: true,
      networkName: hre.network.name,
    });
  });
});

task("deploy")
  .addOptionalVariadicPositionalParam("userModulesPaths")
  .addOptionalParam(
    "parameters",
    "A json object as a string, of the module parameters"
  )
  .setAction(
    async (
      {
        userModulesPaths = [],
        parameters: parametersAsJson,
      }: { userModulesPaths: string[]; parameters?: string },
      hre
    ) => {
      await hre.run("compile", { quiet: true });

      let parameters: { [key: string]: number | string };
      try {
        parameters =
          parametersAsJson !== undefined
            ? JSON.parse(parametersAsJson)
            : undefined;
      } catch {
        console.warn("Could not parse parameters json");
        process.exit(0);
      }

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

      await hre.ignition.deploy(userModules[0], { parameters });
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
