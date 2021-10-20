import "@nomiclabs/hardhat-ethers";
import debug from "debug";
import fsExtra from "fs-extra";
import { extendConfig, extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import { HardhatConfig, HardhatUserConfig } from "hardhat/types";
import { Providers, UserModule } from "ignition";
import path from "path";

import { IgnitionWrapper } from "./ignition-wrapper";
import "./type-extensions";

const log = debug("hardhat-ignition:main");

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
    return new IgnitionWrapper(
      services,
      hre.ethers,
      hre.network.name === "hardhat",
      hre.config.paths
    );
  });
});

task("deploy")
  .addOptionalVariadicPositionalParam("modulesFiles")
  .setAction(async ({ modulesFiles }: { modulesFiles?: string[] }, hre) => {
    await hre.run("compile", { quiet: true });

    let ignitionFiles: string[];
    if (modulesFiles !== undefined) {
      ignitionFiles = modulesFiles.map((x) => path.resolve(process.cwd(), x));
    } else {
      ignitionFiles = fsExtra
        .readdirSync(hre.config.paths.ignition)
        .filter((x) => !x.startsWith("."));
    }

    const userModules: any[] = [];
    for (const ignitionFile of ignitionFiles) {
      const pathToFile = path.resolve(hre.config.paths.ignition, ignitionFile);

      const fileExists = await fsExtra.pathExists(pathToFile);
      if (!fileExists) {
        throw new Error(`Module ${pathToFile} doesn't exist`);
      }

      const userModule = require(pathToFile);
      userModules.push(userModule.default ?? userModule);
    }

    await hre.ignition.deployMany(userModules);
  });

task("plan")
  .addOptionalVariadicPositionalParam("modulesFiles")
  .setAction(async ({ modulesFiles }: { modulesFiles?: string[] }, hre) => {
    await hre.run("compile", { quiet: true });

    const userModules = await loadUserModules(
      hre.config.paths.ignition,
      modulesFiles ?? []
    );

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

async function loadUserModules(
  ignitionDirectory: string,
  modulesFiles: string[]
): Promise<Array<UserModule<any>>> {
  log(`Loading user modules from '${ignitionDirectory}'`);

  let ignitionFiles: string[];
  if (modulesFiles.length === 0) {
    log("No files passed, reading all module files");

    // load all modules in ignition's directory
    ignitionFiles = fsExtra
      .readdirSync(ignitionDirectory)
      .filter((x) => !x.startsWith("."));
  } else {
    log(`Reading '${modulesFiles.length}' selected module files`);
    ignitionFiles = modulesFiles.map((x) => path.resolve(process.cwd(), x));
  }

  log(`Loading '${ignitionFiles.length}' module files`);
  const userModules: any[] = [];
  for (const ignitionFile of ignitionFiles) {
    const pathToFile = path.resolve(ignitionDirectory, ignitionFile);

    const fileExists = await fsExtra.pathExists(pathToFile);
    if (!fileExists) {
      throw new Error(`Module ${pathToFile} doesn't exist`);
    }

    log(`Loading module file '${pathToFile}'`);
    const userModule = require(pathToFile);
    userModules.push(userModule.default ?? userModule);
  }

  return userModules;
}
