import { IgnitionError } from "../../../errors";
import { ERRORS } from "../../../errors-list";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { NamedArtifactContractDeploymentFuture } from "../../../types/module";
import { validateContractConstructorArgsLength } from "../../execution/abi";
import { validateLibraryNames } from "../../execution/libraries";

export async function validateNamedContractDeployment(
  future: NamedArtifactContractDeploymentFuture<string>,
  artifactLoader: ArtifactResolver
) {
  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionError(ERRORS.VALIDATION.INVALID_ARTIFACT, {
      contractName: future.contractName,
    });
  }

  validateLibraryNames(artifact, Object.keys(future.libraries));

  validateContractConstructorArgsLength(
    artifact,
    future.contractName,
    future.constructorArgs
  );
}
