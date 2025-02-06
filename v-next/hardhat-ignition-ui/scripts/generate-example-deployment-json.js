import {
  IgnitionModuleSerializer,
  batches,
} from "@ignored/hardhat-vnext-ignition-core";
import { writeFile } from "node:fs/promises";

import complexModule from "../examples/ComplexModule.js";

const main = async () => {
  await writeDeploymentJsonFor(complexModule);
};

async function writeDeploymentJsonFor(ignitionModule) {
  const serializedIgnitionModule =
    IgnitionModuleSerializer.serialize(ignitionModule);

  const moduleBatches = batches(ignitionModule);

  console.log("Deployment written to ./public/deployment.json");

  await writeFile(
    "./public/deployment.json",
    JSON.stringify(
      { module: serializedIgnitionModule, batches: moduleBatches },
      undefined,
      2,
    ),
  );
}

main();
