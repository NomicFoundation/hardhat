/**
 * Names that can't be used as global- nor task-parameter names.
 */
export const RESERVED_PARAMETER_NAMES = new Set([
  "config",
  "help",
  "showStackTraces",
  "version",
]);

const VALID_PARAM_NAME_CASING_REGEX = /^[a-z][a-zA-Z0-9]*$/;

/**
 * Returns true if the given name is a valid parameter name.
 */
export function isValidParamNameCasing(name: string): boolean {
  return VALID_PARAM_NAME_CASING_REGEX.test(name);
}
