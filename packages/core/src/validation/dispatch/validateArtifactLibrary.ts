import { ethers } from "ethers";

import { Services } from "services/types";
import { ArtifactLibraryDeploymentVertex } from "types/deploymentGraph";
import { VertexResultEnum } from "types/graph";
import {
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "types/validation";
import { IgnitionError } from "utils/errors";
import { isArtifact } from "utils/guards";

import { validateBytesForArtifact } from "./helpers";

export async function validateArtifactLibrary(
  vertex: ArtifactLibraryDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  _context: { services: Services }
): Promise<ValidationVertexVisitResult> {
  const invalidBytes = await validateBytesForArtifact(
    vertex.args,
    _context.services
  );

  if (invalidBytes !== null) {
    return invalidBytes;
  }

  const artifactExists = isArtifact(vertex.artifact);

  if (!artifactExists) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: new IgnitionError(
        `Artifact not provided for library '${vertex.label}'`
      ),
    };
  }

  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(vertex.artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: new IgnitionError(
        `The constructor of the library '${vertex.label}' expects ${expectedArgsLength} arguments but ${argsLength} were given`
      ),
    };
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
