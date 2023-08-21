import {
  SerializedStoredDeployment,
  StoredDeployment,
  StoredDeploymentSerializer,
} from "../ui-helpers";

import { validateStageOne } from "./internal/validation/validateStageOne";
import { ArtifactResolver } from "./types/artifact";

/**
 * Serialize an IgnitionModule for displaying to the user
 *
 * @beta
 */
export async function plan({
  artifactResolver,
  storedDeployment,
}: {
  artifactResolver: ArtifactResolver;
  storedDeployment: StoredDeployment;
}): Promise<SerializedStoredDeployment> {
  await validateStageOne(storedDeployment.module, artifactResolver);

  return StoredDeploymentSerializer.serialize(storedDeployment);
}
