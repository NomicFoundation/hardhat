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
 * This function takes a string in kebab-case format (words separated by hyphens)
 * and converts it to camelCase format (no spaces, with each word after the first
 * starting with an uppercase letter).
 *
 * @param str The kebab-case string to convert.
 * @returns The converted camelCase string.
 */
function kebabToCamelCase(str: string) {
  return str.replace(/-./g, (match) => match.charAt(1).toUpperCase());
}
