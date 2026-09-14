/**
 * Quote a string for safe interpolation into a shell command line, so the
 * receiving shell sees it as exactly one word with all metacharacters
 * (quotes, globs, spaces, `&&`) intact.
 *
 * Naive `'${value}'` wrapping silently corrupts values that themselves
 * contain single quotes — a scenario command like `--skip 'tests/**'` had its
 * quotes cancelled by the wrapper's, leaving the glob exposed to expansion by
 * hyperfine's inner shell (aave's forge cell compiled the whole test suite).
 *
 * Simple words pass through unquoted, keeping composed command lines (and the
 * repro commands printed on failure) readable.
 */
export function shellQuote(value: string): string {
  if (/^[\w@./:=-]+$/.test(value)) {
    return value;
  }

  return `'${value.replace(/'/g, `'\\''`)}'`;
}
