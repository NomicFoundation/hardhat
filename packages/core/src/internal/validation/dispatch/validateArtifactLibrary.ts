import { ethers } from "ethers";

import { ArtifactLibraryDeploymentVertex } from "../../types/deploymentGraph";
import { VertexResultEnum } from "../../types/graph";
import {
  ValidationDispatchContext,
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "../../types/validation";
import { isArtifact } from "../../utils/guards";

import { buildValidationError } from "./helpers";

export async function validateArtifactLibrary(
  vertex: ArtifactLibraryDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  context: ValidationDispatchContext
): Promise<ValidationVertexVisitResult> {
  if (!ethers.utils.isAddress(vertex.from)) {
    return buildValidationError(
      vertex,
      `For library 'from' must be a valid address string`,
      context.callPoints
    );
  }

  const artifactExists = isArtifact(vertex.artifact);

  if (!artifactExists) {
    return buildValidationError(
      vertex,
      `Artifact not provided for library '${vertex.label}'`,
      context.callPoints
    );
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
