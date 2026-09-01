/** Quote a string for safe interpolation into a bash command line. */
export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}
