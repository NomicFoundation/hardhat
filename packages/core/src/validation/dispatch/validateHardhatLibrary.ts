import { ethers } from "ethers";

import { Services } from "services/types";
import { HardhatLibraryDeploymentVertex } from "types/deploymentGraph";
import { VertexResultEnum } from "types/graph";
import {
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "types/validation";
import { IgnitionError, InvalidArtifactError } from "utils/errors";

import { validateBytesForArtifact } from "./helpers";

export async function validateHardhatLibrary(
  vertex: HardhatLibraryDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  { services }: { services: Services }
): Promise<ValidationVertexVisitResult> {
  const invalidBytes = await validateBytesForArtifact(vertex.args, services);

  if (invalidBytes !== null) {
    return invalidBytes;
  }

  const artifactExists = await services.artifacts.hasArtifact(
    vertex.libraryName
  );

  if (!artifactExists) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: new InvalidArtifactError(vertex.libraryName),
    };
  }

  const artifact = await services.artifacts.getArtifact(vertex.libraryName);
  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: new IgnitionError(
        `The constructor of the library '${vertex.libraryName}' expects ${expectedArgsLength} arguments but ${argsLength} were given`
      ),
    };
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
