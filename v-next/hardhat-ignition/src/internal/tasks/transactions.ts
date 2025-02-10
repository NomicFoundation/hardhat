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
