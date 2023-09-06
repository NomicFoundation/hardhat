import { IgnitionValidationError } from "../../../errors";
import { isArtifactType } from "../../../type-guards";
import { ArtifactResolver } from "../../../types/artifact";
import { NamedContractDeploymentFuture } from "../../../types/module";
import { validateContractConstructorArgsLength } from "../../new-execution/abi";
import { validateLibraryNames } from "../../new-execution/libraries";

export async function validateNamedContractDeployment(
  future: NamedContractDeploymentFuture<string>,
  artifactLoader: ArtifactResolver
) {
  const artifact = await artifactLoader.loadArtifact(future.contractName);

  if (!isArtifactType(artifact)) {
    throw new IgnitionValidationError(
      `Artifact for contract '${future.contractName}' is invalid`
    );
  }

  validateLibraryNames(artifact, Object.keys(future.libraries));

  validateContractConstructorArgsLength(
    artifact,
    future.contractName,
    future.constructorArgs
  );
}
