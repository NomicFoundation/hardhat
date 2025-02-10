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
