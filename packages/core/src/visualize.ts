import { IgnitionModuleSerializer } from "./ignition-module-serializer";
import { validateStageOne } from "./internal/validation/validateStageOne";
import { ArtifactResolver } from "./types/artifact";
import { IgnitionModule, IgnitionModuleResult } from "./types/module";
import { SerializedIgnitionModule } from "./types/serialization";

/**
 * Serialize an IgnitionModule for displaying to the user
 *
 * @beta
 */
export async function visualize({
  ignitionModule,
  artifactResolver,
}: {
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  artifactResolver: ArtifactResolver;
}): Promise<SerializedIgnitionModule> {
  await validateStageOne(ignitionModule, artifactResolver);

  return IgnitionModuleSerializer.serialize(ignitionModule);
}
