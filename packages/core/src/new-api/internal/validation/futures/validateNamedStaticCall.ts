import { Interface, FunctionFragment } from "ethers";

import { IgnitionValidationError } from "../../../../errors";
import {
  isAccountRuntimeValue,
  isArtifactType,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { NamedStaticCallFuture } from "../../../types/module";
import {
  retrieveNestedRuntimeValues,
  validateAccountRuntimeValue,
} from "../utils";

export async function validateNamedStaticCall(
  future: NamedStaticCallFuture<string, string>,
  artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
) {
  const runtimeValues = retrieveNestedRuntimeValues(future.args);
  const moduleParams = runtimeValues.filter(isModuleParameterRuntimeValue);
  const accountParams = [
    ...runtimeValues.filter(isAccountRuntimeValue),
    ...(isAccountRuntimeValue(future.from) ? [future.from] : []),
  ];

  accountParams.forEach((arv) => validateAccountRuntimeValue(arv, accounts));

  const missingParams = moduleParams.filter(
    (param) =>
      deploymentParameters[param.moduleId]?.[param.name] === undefined &&
      param.defaultValue === undefined
  );

  if (missingParams.length > 0) {
    throw new IgnitionValidationError(
      `Module parameter '${missingParams[0].name}' requires a value but was given none`
    );
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

  const iface = new Interface(artifact.abi);

  const funcs: FunctionFragment[] = [];
  iface.forEachFunction((func) => {
    if (func.name === future.functionName) {
      funcs.push(func);
    }
  });

  if (funcs.length === 0) {
    throw new IgnitionValidationError(
      `Contract '${future.contract.contractName}' doesn't have a function ${future.functionName}`
    );
  }

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
