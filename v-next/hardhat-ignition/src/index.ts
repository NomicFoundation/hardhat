// import "@nomicfoundation/hardhat-verify";
// // TODO: Bring this file back with Hardhat Verify
// // import { Etherscan } from "@nomicfoundation/hardhat-verify/etherscan";
// import {
//   DeploymentParameters,
//   IgnitionError,
//   ListTransactionsResult,
//   StatusResult,
// } from "@ignored/hardhat-vnext-ignition-core";
// import debug from "debug";
// import { ensureDir, pathExists, readdirSync, rm, writeJSON } from "fs-extra";
// import { extendConfig, extendEnvironment, scope } from "hardhat/config";
// import { HardhatError } from "@ignored/hardhat-vnext-errors";
// import { parse as json5Parse } from "json5";
// import path from "path";

// import "./type-extensions";
// import { calculateDeploymentStatusDisplay } from "./ui/helpers/calculate-deployment-status-display.js";
// import { bigintReviver } from "./utils/bigintReviver.js";
// // TODO: Bring this file back with Hardhat Verify
// // import { getApiKeyAndUrls } from "./utils/getApiKeyAndUrls.js";
// import { readDeploymentParameters } from "./utils/read-deployment-parameters.js";
// import { resolveDeploymentId } from "./utils/resolve-deployment-id.js";
// import { shouldBeHardhatPluginError } from "./utils/shouldBeHardhatPluginError.js";

// // TODO: Bring this file back with Hardhat Verify
// // import { verifyEtherscanContract } from "./utils/verifyEtherscanContract.js";

// /* ignition config defaults */
// const IGNITION_DIR = "ignition";

// const ignitionScope = scope(
//   "ignition",
//   "Deploy your smart contracts using Hardhat Ignition"
// );

// const log = debug("hardhat:ignition");

// extendConfig((config, userConfig) => {
//   /* setup path configs */
//   const userPathsConfig = userConfig.paths ?? {};

//   config.paths = {
//     ...config.paths,
//     ignition: path.resolve(
//       config.paths.root,
//       userPathsConfig.ignition ?? IGNITION_DIR
//     ),
//   };

//   Object.keys(config.networks).forEach((networkName) => {
//     const userNetworkConfig = userConfig.networks?.[networkName] ?? {};

//     config.networks[networkName].ignition = {
//       maxFeePerGasLimit: userNetworkConfig.ignition?.maxFeePerGasLimit,
//       maxPriorityFeePerGas: userNetworkConfig.ignition?.maxPriorityFeePerGas,
//       gasPrice: userNetworkConfig.ignition?.gasPrice,
//       disableFeeBumping: userNetworkConfig.ignition?.disableFeeBumping,
//       explorerUrl: userNetworkConfig.ignition?.explorerUrl,
//     };
//   });

//   /* setup core configs */
//   const userIgnitionConfig = userConfig.ignition ?? {};

//   config.ignition = userIgnitionConfig;
// });

// ignitionScope
//   .task("visualize")
//   .addFlag("noOpen", "Disables opening report in browser")
//   .addPositionalParam("modulePath", "The path to the module file to visualize")
//   .setDescription("Visualize a module as an HTML report")
//   .setAction(
//     async (
//       { noOpen = false, modulePath }: { noOpen: boolean; modulePath: string },
//       hre
//     ) => {
//       const { IgnitionModuleSerializer, batches } = await import(
//         "@ignored/hardhat-vnext-ignition-core"
//       );

//       const { loadModule } = await import("./utils/load-module.js");
//       const { open } = await import("./utils/open.js");

//       const { writeVisualization } = await import(
//         "./visualization/write-visualization.js"
//       );

//       await hre.run("compile", { quiet: true });

//       const userModule = loadModule(hre.config.paths.ignition, modulePath);

//       if (userModule === undefined) {
//         throw new HardhatError(HardhatError.ERRORS.IGNITION.NO_MODULES_FOUND);
//       } else {
//         try {
//           const serializedIgnitionModule =
//             IgnitionModuleSerializer.serialize(userModule);

//           const batchInfo = batches(userModule);

//           await writeVisualization(
//             { module: serializedIgnitionModule, batches: batchInfo },
//             {
//               cacheDir: hre.config.paths.cache,
//             }
//           );
//         } catch (e) {
//           if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
//             throw new HardhatError(
//               HardhatError.ERRORS.IGNITION.INTERNAL_ERROR,
//               e
//             );
//           }

//           throw e;
//         }
//       }

//       if (!noOpen) {
//         const indexFile = path.join(
//           hre.config.paths.cache,
//           "visualization",
//           "index.html"
//         );

//         console.log(`Deployment visualization written to ${indexFile}`);

//         open(indexFile);
//       }
//     }
//   );

// ignitionScope
//   .task("status")
//   .addPositionalParam("deploymentId", "The id of the deployment to show")
//   .setDescription("Show the current status of a deployment")
//   .setAction(async ({ deploymentId }: { deploymentId: string }, hre) => {
//     const { status } = await import("@ignored/hardhat-vnext-ignition-core");

//     const { HardhatArtifactResolver } = await import(
//       "./hardhat-artifact-resolver.js"
//     );

//     const deploymentDir = path.join(
//       hre.config.paths.ignition,
//       "deployments",
//       deploymentId
//     );

//     const artifactResolver = new HardhatArtifactResolver(hre);

//     let statusResult: StatusResult;
//     try {
//       statusResult = await status(deploymentDir, artifactResolver);
//     } catch (e) {
//       if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
//         throw new HardhatError(HardhatError.ERRORS.IGNITION.INTERNAL_ERROR, e);
//       }

//       throw e;
//     }

//     console.log(calculateDeploymentStatusDisplay(deploymentId, statusResult));
//   });

// ignitionScope
//   .task("deployments")
//   .setDescription("List all deployment IDs")
//   .setAction(async (_, hre) => {
//     const { listDeployments } = await import(
//       "@ignored/hardhat-vnext-ignition-core"
//     );

//     const deploymentDir = path.join(hre.config.paths.ignition, "deployments");

//     try {
//       const deployments = await listDeployments(deploymentDir);

//       for (const deploymentId of deployments) {
//         console.log(deploymentId);
//       }
//     } catch (e) {
//       if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
//         throw new HardhatError(HardhatError.ERRORS.IGNITION.INTERNAL_ERROR, e);
//       }

//       throw e;
//     }
//   });

// ignitionScope
//   .task("wipe")
//   .addPositionalParam(
//     "deploymentId",
//     "The id of the deployment with the future to wipe"
//   )
//   .addPositionalParam("futureId", "The id of the future to wipe")
//   .setDescription("Reset a deployment's future to allow rerunning")
//   .setAction(
//     async (
//       { deploymentId, futureId }: { deploymentId: string; futureId: string },
//       hre
//     ) => {
//       const { wipe } = await import("@ignored/hardhat-vnext-ignition-core");

//       const { HardhatArtifactResolver } = await import(
//         "./hardhat-artifact-resolver.js"
//       );

//       const deploymentDir = path.join(
//         hre.config.paths.ignition,
//         "deployments",
//         deploymentId
//       );

//       try {
//         await wipe(deploymentDir, new HardhatArtifactResolver(hre), futureId);
//       } catch (e) {
//         if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
//           throw new HardhatError(
//             HardhatError.ERRORS.IGNITION.INTERNAL_ERROR,
//             e
//           );
//         }

//         throw e;
//       }

//       console.log(`${futureId} state has been cleared`);
//     }
//   );

// // TODO: Bring back Verify once hardhat verify is available
// // ignitionScope
// //   .task("verify")
// //   .addFlag(
// //     "includeUnrelatedContracts",
// //     "Include all compiled contracts in the verification"
// //   )
// //   .addPositionalParam("deploymentId", "The id of the deployment to verify")
// //   .setDescription(
// //     "Verify contracts from a deployment against the configured block explorers"
// //   )
// //   .setAction(
// //     async (
// //       {
// //         deploymentId,
// //         includeUnrelatedContracts = false,
// //       }: { deploymentId: string; includeUnrelatedContracts: boolean },
// //       hre
// //     ) => {
// //       const { getVerificationInformation } = await import(
// //         "@ignored/hardhat-vnext-ignition-core"
// //       );

// //       const deploymentDir = path.join(
// //         hre.config.paths.ignition,
// //         "deployments",
// //         deploymentId
// //       );

// //       if (
// //         hre.config.etherscan === undefined ||
// //         hre.config.etherscan.apiKey === undefined ||
// //         hre.config.etherscan.apiKey === ""
// //       ) {
// //         throw new NomicLabsHardhatPluginError(
// //           "@nomicfoundation/hardhat-ignition",
// //           "No etherscan API key configured"
// //         );
// //       }

// //       try {
// //         for await (const [
// //           chainConfig,
// //           contractInfo,
// //         ] of getVerificationInformation(
// //           deploymentDir,
// //           hre.config.etherscan.customChains,
// //           includeUnrelatedContracts
// //         )) {
// //           if (chainConfig === null) {
// //             console.log(
// //               `Could not resolve contract artifacts for contract "${contractInfo}". Skipping verification.`
// //             );
// //             console.log("");
// //             continue;
// //           }

// //           const apiKeyAndUrls = getApiKeyAndUrls(
// //             hre.config.etherscan.apiKey,
// //             chainConfig
// //           );

// //           const instance = new Etherscan(...apiKeyAndUrls);

// //           console.log(
// //             `Verifying contract "${contractInfo.name}" for network ${chainConfig.network}...`
// //           );

// //           const result = await verifyEtherscanContract(instance, contractInfo);

// //           if (result.type === "success") {
// //             console.log(
// //               `Successfully verified contract "${contractInfo.name}" for network ${chainConfig.network}:\n  - ${result.contractURL}`
// //             );
// //             console.log("");
// //           } else {
// //             if (/already verified/gi.test(result.reason.message)) {
// //               const contractURL = instance.getContractUrl(contractInfo.address);
// //               console.log(
// //                 `Contract ${contractInfo.name} already verified on network ${chainConfig.network}:\n  - ${contractURL}`
// //               );
// //               console.log("");
// //               continue;
// //             } else {
// //               if (!includeUnrelatedContracts) {
// //                 throw new NomicLabsHardhatPluginError(
// //                   "hardhat-ignition",
// //                   `Verification failed. Please run \`hardhat ignition verify ${deploymentId} --include-unrelated-contracts\` to attempt verifying all contracts.`
// //                 );
// //               } else {
// //                 throw new NomicLabsHardhatPluginError(
// //                   "hardhat-ignition",
// //                   result.reason.message
// //                 );
// //               }
// //             }
// //           }
// //         }
// //       } catch (e) {
// //         if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
// //           throw new NomicLabsHardhatPluginError(
// //             "hardhat-ignition",
// //             e.message,
// //             e
// //           );
// //         }

// //         throw e;
// //       }
// //     }
// //   );

// ignitionScope
//   .task("transactions")
//   .addPositionalParam(
//     "deploymentId",
//     "The id of the deployment to show transactions for"
//   )
//   .setDescription("Show all transactions for a given deployment")
//   .setAction(async ({ deploymentId }: { deploymentId: string }, hre) => {
//     const { listTransactions } = await import(
//       "@ignored/hardhat-vnext-ignition-core"
//     );

//     const { HardhatArtifactResolver } = await import(
//       "./hardhat-artifact-resolver.js"
//     );
//     const { calculateListTransactionsDisplay } = await import(
//       "./ui/helpers/calculate-list-transactions-display.js"
//     );

//     const deploymentDir = path.join(
//       hre.config.paths.ignition,
//       "deployments",
//       deploymentId
//     );

//     const artifactResolver = new HardhatArtifactResolver(hre);

//     let listTransactionsResult: ListTransactionsResult;
//     try {
//       listTransactionsResult = await listTransactions(
//         deploymentDir,
//         artifactResolver
//       );
//     } catch (e) {
//       if (e instanceof IgnitionError && shouldBeHardhatPluginError(e)) {
//         throw new HardhatError(HardhatError.ERRORS.IGNITION.INTERNAL_ERROR, e);
//       }

//       throw e;
//     }

//     console.log(
//       calculateListTransactionsDisplay(
//         deploymentId,
//         listTransactionsResult,
//         hre.config.networks[hre.network.name]?.ignition?.explorerUrl
//       )
//     );
//   });

import type { HardhatPlugin } from "@ignored/hardhat-vnext/types/plugins";

import { emptyTask, task } from "@ignored/hardhat-vnext/config";
import { ArgumentType } from "@ignored/hardhat-vnext/types/arguments";

import { PLUGIN_ID } from "./internal/constants.js";

import "./type-extensions/config.js";

const hardhatIgnitionPlugin: HardhatPlugin = {
  id: PLUGIN_ID,
  npmPackage: "@ignored/hardhat-vnext-ignition",
  hookHandlers: {
    config: import.meta.resolve("./internal/hook-handlers/config.js"),
  },
  tasks: [
    emptyTask("ignition", "Store your keys in a secure way").build(),
    task(["ignition", "deploy"], "Deploy a module to the specified network")
      .addPositionalArgument({
        name: "modulePath",
        type: ArgumentType.STRING,
        description: "The path to the module file to deploy",
      })
      .addOption({
        name: "parameters",
        type: ArgumentType.FILE,
        description:
          "A relative path to a JSON file to use for the module parameters",
        defaultValue: "", // TODO: check this comes through correctly
      })
      .addOption({
        name: "deploymentId",
        type: ArgumentType.STRING,
        description: "Set the id of the deployment",
        defaultValue: "", // TODO: check this comes through correctly
      })
      .addOption({
        name: "defaultSender",
        type: ArgumentType.STRING,
        description: "Set the default sender for the deployment",
        defaultValue: "", // TODO: check this comes through correctly
      })
      .addOption({
        name: "strategy",
        type: ArgumentType.STRING,
        description: "Set the deployment strategy to use",
        defaultValue: "basic",
      })
      .addFlag({
        name: "reset",
        description: "Wipes the existing deployment state before deploying",
      })
      .addFlag({
        name: "verify",
        description: "Verify the deployment on Etherscan",
      })
      .addFlag({
        name: "writeLocalhostDeployment",
        description:
          "Write deployment information to disk when deploying to the in-memory network",
      })
      .setAction(import.meta.resolve("./internal/tasks/deploy.js"))
      .build(),
  ],
};

export default hardhatIgnitionPlugin;
