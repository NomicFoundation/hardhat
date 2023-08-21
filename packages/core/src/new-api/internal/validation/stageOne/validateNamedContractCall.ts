import { ethers } from "ethers";

import { IgnitionValidationError } from "../../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { NamedContractCallFuture } from "../../../types/module";

export async function validateNamedContractCall(
  future: NamedContractCallFuture<string, string>,
  artifactLoader: ArtifactResolver
) {
  const artifact =
    "artifact" in future.contract
      ? future.contract.artifact
      : await artifactLoader.loadArtifact(future.contract.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contract.contractName}' is invalid`
    );
  }

  const argsLength = future.args.length;

  const iface = new ethers.utils.Interface(artifact.abi);

  const funcs = Object.entries(iface.functions)
    .filter(([fname]) => fname === future.functionName)
    .map(([, fragment]) => fragment);

  const functionFragments = iface.fragments
    .filter((frag) => frag.name === future.functionName)
    .concat(funcs);

  if (functionFragments.length === 0) {
    throw new IgnitionValidationError(
      `Contract '${future.contract.contractName}' doesn't have a function ${future.functionName}`
    );
  }

  const matchingFunctionFragments = functionFragments.filter(
    (f) => f.inputs.length === argsLength
  );

  if (matchingFunctionFragments.length === 0) {
    if (functionFragments.length === 1) {
      throw new IgnitionValidationError(
        `Function ${future.functionName} in contract ${future.contract.contractName} expects ${functionFragments[0].inputs.length} arguments but ${argsLength} were given`
      );
    } else {
      throw new IgnitionValidationError(
        `Function ${future.functionName} in contract ${future.contract.contractName} is overloaded, but no overload expects ${argsLength} arguments`
      );
    }
  }
}
