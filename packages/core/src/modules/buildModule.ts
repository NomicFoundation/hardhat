import { UserModule } from "./UserModule";
import { ModuleDefinition } from "./types";

export function buildModule<T>(
  moduleId: string,
  moduleDefinition: ModuleDefinition<T>
): UserModule<T> {
  return new UserModule(moduleId, moduleDefinition);
}
