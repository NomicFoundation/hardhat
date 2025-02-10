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
