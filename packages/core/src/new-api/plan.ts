import { IgnitionModule, SerializedStoredDeployment } from "../ui-helpers";
import { ArtifactResolver } from "./types/artifact";

/**
 * Serialize an IgnitionModule for displaying to the user
 *
 * @beta
 */
// @ts-ignore
export async function plan({
  artifactResolver,
  moduleDefinition,
  verbose,
}: {
  artifactResolver: ArtifactResolver;
  moduleDefinition: IgnitionModule;
  verbose: boolean;
}): Promise<SerializedStoredDeployment>;
