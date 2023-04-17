import { ethers } from "ethers";

import { StaticCallDeploymentVertex } from "../../types/deploymentGraph";
import { VertexResultEnum } from "../../types/graph";
import {
  ValidationDispatchContext,
  ValidationResultsAccumulator,
  ValidationVertexVisitResult,
} from "../../types/validation";

import {
  buildValidationError,
  resolveArtifactForCallableFuture,
} from "./helpers";

export async function validateStaticCall(
  vertex: StaticCallDeploymentVertex,
  _resultAccumulator: ValidationResultsAccumulator,
  context: ValidationDispatchContext
): Promise<ValidationVertexVisitResult> {
  if (!ethers.utils.isAddress(vertex.from)) {
    return buildValidationError(
      vertex,
      `For static call 'from' must be a valid address string`,
      context.callPoints
    );
  }

  const contractName = vertex.contract.label;

  const artifactAbi = await resolveArtifactForCallableFuture(
    vertex.contract,
    context
  );

  if (artifactAbi === undefined) {
    return buildValidationError(
      vertex,
      `Artifact with name '${contractName}' doesn't exist`,
      context.callPoints
    );
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
    return buildValidationError(
      vertex,
      `Contract '${contractName}' doesn't have a function ${vertex.method}`,
      context.callPoints
    );
  }

  const matchingFunctionFragments = functionFragments.filter(
    (f) => f.inputs.length === argsLength
  );

  if (matchingFunctionFragments.length === 0) {
    if (functionFragments.length === 1) {
      return buildValidationError(
        vertex,
        `Function ${vertex.method} in contract ${contractName} expects ${functionFragments[0].inputs.length} arguments but ${argsLength} were given`,
        context.callPoints
      );
    } else {
      return buildValidationError(
        vertex,
        `Function ${vertex.method} in contract ${contractName} is overloaded, but no overload expects ${argsLength} arguments`,
        context.callPoints
      );
    }
  }

  const funcFrag =
    matchingFunctionFragments[0] as ethers.utils.FunctionFragment;

  if (!funcFrag.constant) {
    return buildValidationError(
      vertex,
      `Function ${vertex.method} in contract ${contractName} is not 'pure' or 'view' and cannot be statically called`,
      context.callPoints
    );
  }

  return {
    _kind: VertexResultEnum.SUCCESS,
    result: undefined,
  };
}
