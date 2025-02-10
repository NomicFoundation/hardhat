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
