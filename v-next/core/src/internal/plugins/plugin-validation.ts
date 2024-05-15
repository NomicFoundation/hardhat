import { HardhatPlugin } from "../../types/plugins.js";

export async function validatePluginNpmDependencies(_plugin: HardhatPlugin) {
  // TODO: If it has an npm package, validate their peer dependencies
  // If any is missing, throw
}
