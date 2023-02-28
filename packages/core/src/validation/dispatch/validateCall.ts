import { ethers, BigNumber } from "ethers";

import { Services } from "services/types";
import { CallDeploymentVertex } from "types/deploymentGraph";
import { VertexResultEnum } from "types/graph";
import {
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "types/validation";
import { IgnitionError, InvalidArtifactError } from "utils/errors";
import { isParameter } from "utils/guards";

import {
  resolveArtifactForCallableFuture,
  validateBytesForArtifact,
} from "./helpers";

export async function validateCall(
  vertex: CallDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  context: { services: Services }
): Promise<ValidationVertexVisitResult> {
  if (!BigNumber.isBigNumber(vertex.value) && !isParameter(vertex.value)) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: new IgnitionError(`For call 'value' must be a BigNumber`),
    };
  }

  const invalidBytes = await validateBytesForArtifact(
    vertex.args,
    context.services
  );

  if (invalidBytes !== null) {
    return invalidBytes;
  }

  const contractName = vertex.contract.label;

  const artifactAbi = await resolveArtifactForCallableFuture(
    vertex.contract,
    context
  );

  if (artifactAbi === undefined) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: new InvalidArtifactError(contractName),
    };
  }

  const argsLength = vertex.args.length;

  const iface = new ethers.utils.Interface(artifactAbi);

  const funcs = Object.entries(iface.functions)
    .filter(([fname]) => fname === vertex.method)
    .map(([, fragment]) => fragment);

  const functionFragments = iface.fragments
    .filter((frag) => frag.name === vertex.method)
    .concat(funcs);

  if (functionFragments.length === 0) {
    return {
      _kind: VertexResultEnum.FAILURE,
      failure: new IgnitionError(
        `Contract '${contractName}' doesn't have a function ${vertex.method}`
      ),
    };
  }

  const matchingFunctionFragments = functionFragments.filter(
    (f) => f.inputs.length === argsLength
  );

  if (matchingFunctionFragments.length === 0) {
    if (functionFragments.length === 1) {
      return {
        _kind: VertexResultEnum.FAILURE,
        failure: new IgnitionError(
          `Function ${vertex.method} in contract ${contractName} expects ${functionFragments[0].inputs.length} arguments but ${argsLength} were given`
        ),
      };
    } else {
      return {
        _kind: VertexResultEnum.FAILURE,
        failure: new IgnitionError(
          `Function ${vertex.method} in contract ${contractName} is overloaded, but no overload expects ${argsLength} arguments`
        ),
      };
    }
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
