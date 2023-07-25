import { ethers } from "ethers";

import { IgnitionValidationError } from "../../../../errors";
import {
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import {
  ModuleParameters,
  NamedContractCallFuture,
} from "../../../types/module";
import { retrieveNestedRuntimeValues } from "../../utils/retrieve-nested-runtime-values";

export async function validateNamedContractCall(
  future: NamedContractCallFuture<string, string>,
  artifactLoader: ArtifactResolver,
  moduleParameters: ModuleParameters
) {
  const moduleParams = retrieveNestedRuntimeValues(future.args);

  const missingParams = moduleParams.filter(
    (param) =>
      moduleParameters[param.name] === undefined &&
      param.defaultValue === undefined
  );

  if (missingParams.length > 0) {
    throw new IgnitionValidationError(
      `Module parameter '${missingParams[0].name}' requires a value but was given none`
    );
  }

  if (isModuleParameterRuntimeValue(future.value)) {
    const param =
      moduleParameters[future.value.name] ?? future.value.defaultValue;
    if (param === undefined) {
      throw new IgnitionValidationError(
        `Module parameter '${future.value.name}' requires a value but was given none`
      );
    } else if (typeof param !== "bigint") {
      throw new IgnitionValidationError(
        `Module parameter '${
          future.value.name
        }' must be of type 'bigint' but is '${typeof param}'`
      );
    }
  }

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
