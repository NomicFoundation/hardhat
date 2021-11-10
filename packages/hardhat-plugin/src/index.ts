import "@nomiclabs/hardhat-ethers";
import {
  extendConfig,
  extendEnvironment,
  subtask,
  task,
  types,
} from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { HardhatConfig, HardhatUserConfig } from "hardhat/types";
import { Providers, UserModule } from "ignition";
import path from "path";

import { IgnitionWrapper } from "./ignition-wrapper";
import { loadUserModules } from "./modules";
import "./type-extensions";

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    const userIgnitionPath = userConfig.paths?.ignition;
    const userDeploymentsPath = userConfig.paths?.deployments;

    let ignitionPath: string;
    if (userIgnitionPath === undefined) {
      ignitionPath = path.join(config.paths.root, "ignition");
    } else {
      if (path.isAbsolute(userIgnitionPath)) {
        ignitionPath = userIgnitionPath;
      } else {
        ignitionPath = path.normalize(
          path.join(config.paths.root, userIgnitionPath)
        );
      }
    }

    let deploymentsPath: string;
    if (userDeploymentsPath === undefined) {
      deploymentsPath = path.join(config.paths.root, "deployments");
    } else {
      if (path.isAbsolute(userDeploymentsPath)) {
        deploymentsPath = userDeploymentsPath;
      } else {
        deploymentsPath = path.normalize(
          path.join(config.paths.root, userDeploymentsPath)
        );
      }
    }

    config.paths.ignition = ignitionPath;
    config.paths.deployments = deploymentsPath;
  }
);

extendEnvironment((hre) => {
  const services: Providers = {
    artifacts: {
      getArtifact: (name: string) => hre.artifacts.readArtifact(name),
      hasArtifact: (name: string) => hre.artifacts.artifactExists(name),
    },
    gasProvider: {
      estimateGasLimit: async (tx) => {
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
      isConfirmed: async (txHash) => {
        const blockNumber = await hre.ethers.provider.getBlockNumber();
        const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
        if (receipt === null) {
          return false;
        }

        return receipt.blockNumber <= blockNumber;
      },
      isMined: async (txHash) => {
        const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
        return receipt !== null;
      },
    },
  };

  hre.ignition = lazyObject(() => {
    const pathToJournal =
      hre.network.name !== "hardhat"
        ? path.resolve(hre.config.paths.root, "ignition-journal.json")
        : undefined;
    const txPollingInterval = hre.network.name !== "hardhat" ? 5000 : 100;

    return new IgnitionWrapper(
      services,
      hre.ethers,
      hre.network.name === "hardhat",
      hre.config.paths,
      { pathToJournal, txPollingInterval }
    );
  });
});

task("deploy")
  .addOptionalVariadicPositionalParam("modulesFiles")
  .setAction(async ({ modulesFiles }: { modulesFiles?: string[] }, hre) => {
    await hre.run("compile", { quiet: true });

    const userModules = await loadUserModules(
      hre.config.paths.ignition,
      modulesFiles ?? []
    );

    await hre.run("deploy:deploy-modules", {
      userModules,
    });
  });

subtask("deploy:deploy-modules")
  .addParam("userModules", undefined, undefined, types.any)
  .setAction(
    async (
      {
        userModules,
      }: { userModules: Array<UserModule<any>>; pathToJournal?: string },
      hre
    ) => {
      if (userModules.length === 0) {
        console.warn("No Ignition modules found");
        process.exit(0);
      }

      const [deploymentResult] = await hre.ignition.deployMany(userModules);

      return deploymentResult;
    }
  );

task("plan")
  .addOptionalVariadicPositionalParam("modulesFiles")
  .setAction(async ({ modulesFiles }: { modulesFiles?: string[] }, hre) => {
    await hre.run("compile", { quiet: true });

    const userModules = await loadUserModules(
      hre.config.paths.ignition,
      modulesFiles ?? []
    );

    if (userModules.length === 0) {
      console.warn("No Ignition modules found");
      process.exit(0);
    }

    const plan = await hre.ignition.buildPlan(userModules);

    let first = true;
    for (const [moduleId, modulePlan] of Object.entries(plan)) {
      if (first) {
        first = false;
      } else {
        console.log();
      }
      console.log(`- Module ${moduleId}`);
      if (modulePlan === "already-deployed") {
        console.log("    Already deployed");
      } else {
        for (const step of modulePlan) {
          console.log(`    ${step.id}: ${step.description}`);
        }
      }
    }
  });
