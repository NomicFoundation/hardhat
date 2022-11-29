import { ethers, BigNumber } from "ethers";

import { Services } from "services/types";
import { CallDeploymentVertex } from "types/deploymentGraph";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { IgnitionError } from "utils/errors";
import { isParameter } from "utils/guards";

import { resolveArtifactForCallableFuture } from "./helpers";

export async function validateCall(
  vertex: CallDeploymentVertex,
  _resultAccumulator: ResultsAccumulator,
  context: { services: Services }
): Promise<VertexVisitResult> {
  if (!BigNumber.isBigNumber(vertex.value) && !isParameter(vertex.value)) {
    return {
      _kind: "failure",
      failure: new IgnitionError(`For call 'value' must be a BigNumber`),
    };
  }

  const contractName = vertex.contract.label;

  const artifactAbi = await resolveArtifactForCallableFuture(
    vertex.contract,
    context
  );

  if (artifactAbi === undefined) {
    return {
      _kind: "failure",
      failure: new Error(`Artifact with name '${contractName}' doesn't exist`),
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
      _kind: "failure",
      failure: new Error(
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
        _kind: "failure",
        failure: new Error(
          `Function ${vertex.method} in contract ${contractName} expects ${functionFragments[0].inputs.length} arguments but ${argsLength} were given`
        ),
      };
    } else {
      return {
        _kind: "failure",
        failure: new Error(
          `Function ${vertex.method} in contract ${contractName} is overloaded, but no overload expects ${argsLength} arguments`
        ),
      };
    }
  }

  return {
    _kind: "success",
    result: undefined,
  };
}
