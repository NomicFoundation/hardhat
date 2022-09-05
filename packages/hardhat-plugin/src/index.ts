import "@nomiclabs/hardhat-ethers";
import { Providers, UserRecipe } from "@nomicfoundation/ignition-core";
import { extendConfig, extendEnvironment, task } from "hardhat/config";
import { lazyObject } from "hardhat/plugins";
import path from "path";

import { ConfigWrapper } from "./ConfigWrapper";
import { IgnitionWrapper } from "./ignition-wrapper";
import { loadUserRecipes, loadAllUserRecipes } from "./user-recipes";
import "./type-extensions";

export {
  buildRecipe,
  RecipeBuilder,
  AddressLike,
  ContractFuture,
  ContractOptions,
  InternalFuture,
  InternalContractFuture,
  Executor,
  Contract,
  Services,
  Future,
  Hold,
  buildRecipeSingleGraph,
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
    config: new ConfigWrapper(),
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

task("deploySingleGraph")
  .addOptionalVariadicPositionalParam("userRecipesPaths")
  .addOptionalParam(
    "parameters",
    "A json object as a string, of the recipe paramters"
  )
  .setAction(
    async (
      {
        userRecipesPaths = [],
        parameters: parametersAsJson,
      }: { userRecipesPaths: string[]; parameters?: string },
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

      let userRecipes: Array<UserRecipe<any>>;
      if (userRecipesPaths.length === 0) {
        userRecipes = loadAllUserRecipes(hre.config.paths.ignition);
      } else {
        userRecipes = loadUserRecipes(
          hre.config.paths.ignition,
          userRecipesPaths
        );
      }

      if (userRecipes.length === 0) {
        console.warn("No Ignition recipes found");
        process.exit(0);
      }

      await hre.ignition.deploySingleGraph(userRecipes[0], { parameters });
    }
  );
