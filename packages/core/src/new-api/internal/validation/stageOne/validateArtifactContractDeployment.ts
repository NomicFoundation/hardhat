import { Interface } from "ethers";

import { IgnitionValidationError } from "../../../../errors";
import { ArtifactResolver } from "../../../types/artifact";
import { ArtifactContractDeploymentFuture } from "../../../types/module";
import { validateLibraryNames } from "../../new-execution/libraries";

export async function validateArtifactContractDeployment(
  future: ArtifactContractDeploymentFuture,
  _artifactLoader: ArtifactResolver
) {
  const artifact = future.artifact;

  validateLibraryNames(artifact, Object.keys(future.libraries));

  const argsLength = future.constructorArgs.length;

  const iface = new Interface(artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    throw new IgnitionValidationError(
      `The constructor of the contract '${future.contractName}' expects ${expectedArgsLength} arguments but ${argsLength} were given`
    );
  }
}
