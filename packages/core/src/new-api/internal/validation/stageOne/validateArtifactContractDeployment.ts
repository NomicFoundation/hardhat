import { ethers } from "ethers";

import { IgnitionValidationError } from "../../../../errors";
import { ArtifactResolver } from "../../../types/artifact";
import { ArtifactContractDeploymentFuture } from "../../../types/module";

export async function validateArtifactContractDeployment(
  future: ArtifactContractDeploymentFuture,
  _artifactLoader: ArtifactResolver
) {
  const artifact = future.artifact;

  const argsLength = future.constructorArgs.length;

  const iface = new ethers.utils.Interface(artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    throw new IgnitionValidationError(
      `The constructor of the contract '${future.contractName}' expects ${expectedArgsLength} arguments but ${argsLength} were given`
    );
  }
}
