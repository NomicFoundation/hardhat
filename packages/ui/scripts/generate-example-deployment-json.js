import {
  ModuleConstructor,
  StoredDeploymentSerializer,
} from "@ignored/ignition-core";
import { writeFile } from "node:fs/promises";

import moduleDefinition from "../examples/ComplexModule.js";

const main = async () => {
  await writeDeploymentJsonFor({
    details: {
      chainId: 999,
      networkName: "Hardhat",
    },
    moduleDefinition: moduleDefinition,
  });
};

async function writeDeploymentJsonFor(deployment) {
  const serializedDeployment = serializeDeployment(deployment);

  console.log("Deployment written to ./public/deployment.json");

  await writeFile(
    "./public/deployment.json",
    JSON.stringify(serializedDeployment, undefined, 2)
  );
}

function serializeDeployment(deployment) {
  const constructor = new ModuleConstructor(deployment.details.chainId, []);
  const module = constructor.construct(deployment.moduleDefinition);

  const serializedModule = StoredDeploymentSerializer.serialize({
    details: deployment.details,
    module,
  });

  return serializedModule;
}

main();
