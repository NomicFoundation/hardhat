import { StoredDeploymentSerializer } from "@ignored/ignition-core";
import { writeFile } from "node:fs/promises";

import complexModule from "../examples/ComplexModule.js";

const main = async () => {
  await writeDeploymentJsonFor({
    details: {
      chainId: 999,
      networkName: "Hardhat",
    },
    module: complexModule,
  });
};

async function writeDeploymentJsonFor(deployment) {
  const serializedDeployment = StoredDeploymentSerializer.serialize(deployment);

  console.log("Deployment written to ./public/deployment.json");

  await writeFile(
    "./public/deployment.json",
    JSON.stringify(serializedDeployment, undefined, 2)
  );
}

main();
