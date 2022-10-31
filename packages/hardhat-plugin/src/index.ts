import "@nomiclabs/hardhat-ethers";
import { Module, ModuleDict, Providers } from "@ignored/ignition-core";
import { extendConfig, extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import path from "path";

import { ConfigWrapper } from "./ConfigWrapper";
import { IgnitionWrapper } from "./ignition-wrapper";
import { Renderer } from "./plan";
import { loadUserModules, loadAllUserModules } from "./user-modules";
import "./type-extensions";

export { buildSubgraph, buildModule } from "@ignored/ignition-core";

extendConfig((config, userConfig) => {
  const userIgnitionPath = userConfig.paths?.ignition;
  const userDeploymentsPath = userConfig.paths?.deployments;

  let ignitionPath: string;
  if (userIgnitionPath === undefined) {
    ignitionPath = path.join(config.paths.root, "ignition");
  } else {
    ignitionPath = path.resolve(config.paths.root, userIgnitionPath);
  }

  let deploymentsPath: string;
  if (userDeploymentsPath === undefined) {
    deploymentsPath = path.join(config.paths.root, "deployments");
  } else {
    deploymentsPath = path.resolve(config.paths.root, userDeploymentsPath);
  }

  config.paths.ignition = ignitionPath;
  config.paths.deployments = deploymentsPath;
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
      pathToJournal,
      txPollingInterval,
      ui: true,
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

      await hre.ignition.deploy(userModules[0], { parameters, ui: true });
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
