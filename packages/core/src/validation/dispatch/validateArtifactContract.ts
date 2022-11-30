import { ethers, BigNumber } from "ethers";

import { Services } from "services/types";
import { ArtifactContractDeploymentVertex } from "types/deploymentGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { IgnitionError, InvalidArtifactError } from "utils/errors";
import { isArtifact, isParameter } from "utils/guards";

import { validateBytesForArtifact } from "./helpers";

export async function validateArtifactContract(
  vertex: ArtifactContractDeploymentVertex,
  _resultAccumulator: ResultsAccumulator,
  _context: { services: Services }
): Promise<VertexVisitResult> {
  if (!BigNumber.isBigNumber(vertex.value) && !isParameter(vertex.value)) {
    return {
      _kind: "failure",
      failure: new IgnitionError(`For contract 'value' must be a BigNumber`),
    };
  }

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
      _kind: "failure",
      failure: new InvalidArtifactError(vertex.label),
    };
  }

  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(vertex.artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    return {
      _kind: "failure",
      failure: new Error(
        `The constructor of the contract '${vertex.label}' expects ${expectedArgsLength} arguments but ${argsLength} were given`
      ),
    };
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
