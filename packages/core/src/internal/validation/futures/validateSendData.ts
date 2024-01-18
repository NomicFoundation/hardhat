import { IgnitionError } from "../../../errors";
import {
  isAccountRuntimeValue,
  isModuleParameterRuntimeValue,
} from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { DeploymentParameters } from "../../../types/deploy";
import { SendDataFuture } from "../../../types/module";
import { ERRORS } from "../../errors-list";
import { validateAccountRuntimeValue } from "../utils";

export async function validateSendData(
  future: SendDataFuture,
  _artifactLoader: ArtifactResolver,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): Promise<string[]> {
  const errors: IgnitionError[] = [];

  /* stage two */

  const accountParams = [
    ...(isAccountRuntimeValue(future.from) ? [future.from] : []),
    ...(isAccountRuntimeValue(future.to) ? [future.to] : []),
  ];

  errors.push(
    ...accountParams.flatMap((arv) =>
      validateAccountRuntimeValue(arv, accounts)
    )
  );

  if (isModuleParameterRuntimeValue(future.to)) {
    const param =
      deploymentParameters[future.to.moduleId]?.[future.to.name] ??
      future.to.defaultValue;
    if (param === undefined) {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.MISSING_MODULE_PARAMETER, {
          name: future.to.name,
        })
      );
    } else if (typeof param !== "string") {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.INVALID_MODULE_PARAMETER_TYPE, {
          name: future.to.name,
          expectedType: "string",
          actualType: typeof param,
        })
      );
    }
  }

  if (isModuleParameterRuntimeValue(future.value)) {
    const param =
      deploymentParameters[future.value.moduleId]?.[future.value.name] ??
      future.value.defaultValue;
    if (param === undefined) {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.MISSING_MODULE_PARAMETER, {
          name: future.value.name,
        })
      );
    } else if (typeof param !== "bigint") {
      errors.push(
        new IgnitionError(ERRORS.VALIDATION.INVALID_MODULE_PARAMETER_TYPE, {
          name: future.value.name,
          expectedType: "bigint",
          actualType: typeof param,
        })
      );
    }
  }

  return errors.map((e) => e.message);
}
