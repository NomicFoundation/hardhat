/**
 * This is a JSON.stringify function with a custom replacer that stringifies bigints as strings.
 */
export function stringifyArgs(obj: any): string {
  return JSON.stringify(obj, (key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}
