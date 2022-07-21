import "@nomiclabs/hardhat-ethers";
import { Providers, UserModule } from "@nomicfoundation/ignition-core";
import {
  extendConfig,
  extendEnvironment,
  subtask,
  task,
  types,
} from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import path from "path";

import { IgnitionWrapper } from "./ignition-wrapper";
import { loadUserModules, loadAllUserModules } from "./user-modules";
import "./type-extensions";

export {
  buildModule,
  ModuleBuilder,
  AddressLike,
  ContractBinding,
  ContractOptions,
  InternalBinding,
  InternalContractBinding,
  Executor,
  Contract,
  Services,
  Binding,
  Hold,
} from "@nomicfoundation/ignition-core";

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
    const isHardhatNetwork = hre.network.name === "hardhat";

    const pathToJournal = isHardhatNetwork
      ? undefined
      : path.resolve(hre.config.paths.root, "ignition-journal.json");

    const txPollingInterval = isHardhatNetwork ? 100 : 5000;

    return new IgnitionWrapper(
      providers,
      hre.ethers,
      isHardhatNetwork,
      hre.config.paths,
      { pathToJournal, txPollingInterval }
    );
  });
});

/**
 * Deploy the given user modules. If none is passed, all modules under
 * the `paths.ignition` directory are deployed.
 */
task("deploy")
  .addOptionalVariadicPositionalParam("userModulesPaths")
  .setAction(
    async ({ userModulesPaths = [] }: { userModulesPaths: string[] }, hre) => {
      await hre.run("compile", { quiet: true });

      let userModules: Array<UserModule<any>>;
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

      await hre.run("deploy:deploy-modules", {
        userModules,
      });
    }
  );

subtask("deploy:deploy-modules")
  .addParam("userModules", undefined, undefined, types.any)
  .setAction(
    async (
      {
        userModules,
      }: { userModules: Array<UserModule<any>>; pathToJournal?: string },
      hre
    ) => {
      // we ignore the module outputs because they are not relevant when
      // the deployment is done via a task (as opposed to a deployment
      // done with `hre.ignition.deploy`)
      const [serializedDeploymentResult] = await hre.ignition.deployMany(
        userModules
      );

      return serializedDeploymentResult;
    }
  );

/**
 * Build and show the deployment plan for the given user modules.
 */
task("plan")
  .addOptionalVariadicPositionalParam("userModulesPaths")
  .setAction(
    async ({ userModulesPaths = [] }: { userModulesPaths: string[] }, hre) => {
      await hre.run("compile", { quiet: true });

      let userModules: Array<UserModule<any>>;
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
    }
  );
