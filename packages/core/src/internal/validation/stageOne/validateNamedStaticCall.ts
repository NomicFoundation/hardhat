import { IgnitionError } from "../../../errors";
import { ERRORS } from "../../../errors-list";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { StaticCallFuture } from "../../../types/module";
import {
  validateArtifactFunction,
  validateFunctionArgumentParamType,
} from "../../execution/abi";

export async function validateNamedStaticCall(
  future: StaticCallFuture<string, string>,
  artifactLoader: ArtifactResolver
) {
  const artifact =
    "artifact" in future.contract
      ? future.contract.artifact
      : await artifactLoader.loadArtifact(future.contract.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionError(ERRORS.VALIDATION.INVALID_ARTIFACT, {
      contractName: future.contract.contractName,
    });
  }

  validateArtifactFunction(
    artifact,
    future.contract.contractName,
    future.functionName,
    future.args,
    true
  );

  validateFunctionArgumentParamType(
    future.contract.contractName,
    future.functionName,
    artifact,
    future.nameOrIndex
  );
}
