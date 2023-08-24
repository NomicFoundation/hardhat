import { FunctionFragment, Interface } from "ethers";

import { IgnitionValidationError } from "../../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { NamedStaticCallFuture } from "../../../types/module";
import { validateArtifactFunctionName } from "../../new-execution/abi";

export async function validateNamedStaticCall(
  future: NamedStaticCallFuture<string, string>,
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

  validateArtifactFunctionName(artifact, future.functionName);

  const argsLength = future.args.length;

  const iface = new Interface(artifact.abi);

  const funcs: FunctionFragment[] = [];
  iface.forEachFunction((func) => {
    if (func.name === future.functionName) {
      funcs.push(func);
    }
  });

  const matchingFunctionFragments = funcs.filter(
    (f) => f.inputs.length === argsLength
  );

  if (matchingFunctionFragments.length === 0) {
    if (funcs.length === 1) {
      throw new IgnitionValidationError(
        `Function ${future.functionName} in contract ${future.contract.contractName} expects ${funcs[0].inputs.length} arguments but ${argsLength} were given`
      );
    } else {
      throw new IgnitionValidationError(
        `Function ${future.functionName} in contract ${future.contract.contractName} is overloaded, but no overload expects ${argsLength} arguments`
      );
    }
  }

  const funcFrag = matchingFunctionFragments[0] as FunctionFragment;

  if (!funcFrag.constant) {
    throw new IgnitionValidationError(
      `Function ${future.functionName} in contract ${future.contract.contractName} is not 'pure' or 'view' and cannot be statically called`
    );
  }
}
