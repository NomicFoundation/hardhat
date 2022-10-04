import { ethers } from "ethers";

import { Services } from "services/types";
import { CallableFuture } from "types/future";
import { ResultsAccumulator, VertexVisitResult } from "types/graph";
import { CallRecipeVertex } from "types/recipeGraph";

export async function validateCall(
  vertex: CallRecipeVertex,
  _resultAccumulator: ResultsAccumulator,
  context: { services: Services }
): Promise<VertexVisitResult> {
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

async function resolveArtifactForCallableFuture(
  future: CallableFuture,
  { services }: { services: Services }
): Promise<any[] | undefined> {
  switch (future.type) {
    case "contract":
      switch (future.subtype) {
        case "artifact":
          return future.artifact.abi;
        case "deployed":
          return future.abi;
        case "hardhat":
          const artifact = await services.artifacts.getArtifact(
            future.contractName
          );
          return artifact.abi;
        default:
          assertNeverRecipeFuture(future);
      }
    case "library":
      switch (future.subtype) {
        case "artifact":
          return future.artifact.abi;
        case "hardhat":
          const artifact = await services.artifacts.getArtifact(
            future.libraryName
          );
          return artifact.abi;
        default:
          assertNeverRecipeFuture(future);
      }
    default:
      assertNeverRecipeFuture(future);
  }
}

function assertNeverRecipeFuture(f: never) {
  throw new Error(`Unexpected recipe future type/subtype ${f}`);
}
