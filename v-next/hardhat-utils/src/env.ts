import { camelToSnakeCase } from "./string.js";

/**
 * Sets the resolved global options as environment variables.
 *
 * @param globalOptions An object containing the resolved global options,
 * with each option adhering to its definition in the globalOptionDefinitions.
 */
export function setGlobalOptionsAsEnvVariables(
  globalOptions: Record<string, string | boolean>,
): void {
  for (const [name, value] of Object.entries(globalOptions)) {
    const envName = getEnvVariableNameFromGlobalOption(name);

    if (value !== undefined) {
      process.env[envName] = String(value);
    }
  }
}

/**
 * Converts a global option name to its corresponding environment variable name.
 * The conversion involves transforming the option name from camelCase to
 * SNAKE_CASE and prefixing it with "HARDHAT_".
 *
 * @param globalOptionName The name of the global option in camelCase.
 *
 * @returns The corresponding environment variable name in the format
 * "HARDHAT_<OPTION_NAME_IN_SNAKE_CASE>".
 */
export function getEnvVariableNameFromGlobalOption(globalOptionName: string) {
  return `HARDHAT_${camelToSnakeCase(globalOptionName).toUpperCase()}`;
}
