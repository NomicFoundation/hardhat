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
