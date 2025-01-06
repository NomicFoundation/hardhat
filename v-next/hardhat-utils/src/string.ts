/**
 * Converts a word in singular form to a pluralized string based on the number
 * of items.
 *
 * @param singular The singular form of the word.
 * @param count The number of items. This determines whether the singular or
 * plural form is used.
 * @param plural The optional plural form of the word. If not provided, the
 * plural form is created by appending an "s" to the singular form.
 * @returns The pluralized string.
 */
export function pluralize(
  singular: string,
  count: number,
  plural?: string,
): string {
  if (count === 1) {
    return singular;
  }

  return plural !== undefined ? plural : `${singular}s`;
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param str The string to capitalize.
 * @returns The string with the first letter capitalized.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a kebab-case string to camelCase.
 *
 * @param str The kebab-case string to convert.
 * @returns The camelCase string.
 */
export function kebabToCamelCase(str: string): string {
  return str.replace(/-./g, (match) => match.charAt(1).toUpperCase());
}

/**
 * Converts a camelCase string to snake_case.
 *
 * @param str The camelCase string to convert.
 * @returns The snake_case string.
 */
export function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z0-9]/g, (match) => `_${match.toLowerCase()}`);
}

/**
 * Converts a camelCase string to kebab-case.
 *
 * @param str The camelCase string to convert.
 * @returns The kebab-case string.
 */
export function camelToKebabCase(str: string): string {
  return str.replace(/[A-Z0-9]/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * Ensures a string ends with a slash.
 */
export function ensureTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : path + "/";
}
