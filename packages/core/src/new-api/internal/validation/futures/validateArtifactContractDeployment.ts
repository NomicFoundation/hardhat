import { Interface } from "ethers";

import { IgnitionValidationError } from "../../../../errors";
import {
  isAccountRuntimeValue,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deployer";
import { ArtifactContractDeploymentFuture } from "../../../types/module";
import {
  retrieveNestedRuntimeValues,
  validateAccountRuntimeValue,
} from "../utils";

export async function validateArtifactContractDeployment(
  future: ArtifactContractDeploymentFuture,
  _artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
) {
  const runtimeValues = retrieveNestedRuntimeValues(future.constructorArgs);
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

  if (isModuleParameterRuntimeValue(future.value)) {
    const param =
      deploymentParameters[future.value.moduleId]?.[future.value.name] ??
      future.value.defaultValue;
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

  const artifact = future.artifact;

  const argsLength = future.constructorArgs.length;

  const iface = new Interface(artifact.abi);
  const expectedArgsLength = iface.deploy.inputs.length;

  if (argsLength !== expectedArgsLength) {
    throw new IgnitionValidationError(
      `The constructor of the contract '${future.contractName}' expects ${expectedArgsLength} arguments but ${argsLength} were given`
    );
  }
}
