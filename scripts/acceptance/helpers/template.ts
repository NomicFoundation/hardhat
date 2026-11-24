/**
 * `{{name}}` placeholders in a scenario's script.
 *
 * The script is expanded before it runs, so what runs, what is written to
 * disk and what a failure prints are all the commands a user would type —
 * `pnpm hardhat compile`, not `$RUN hardhat compile`.
 *
 * `{{ }}` is reserved for input. Placeholders in expected output, when output
 * is asserted, use a different sigil so the two cannot be confused.
 */

const PLACEHOLDER = /\{\{\s*([^{}]*?)\s*\}\}/g;

export interface Placeholder {
  name: string;
  /** 1-based line within the script. */
  line: number;
}

export function findPlaceholders(script: string): Placeholder[] {
  const found: Placeholder[] = [];

  for (const [index, line] of script.split("\n").entries()) {
    for (const match of line.matchAll(PLACEHOLDER)) {
      found.push({ name: match[1], line: index + 1 });
    }
  }

  return found;
}

/**
 * Replace every placeholder with its value. An unknown name is an error, never
 * left in place: a literal `{{run}}` reaching the shell would fail obscurely.
 */
export function expandTemplate(
  script: string,
  values: Record<string, string>,
): string {
  return script.replace(PLACEHOLDER, (placeholder, name: string) => {
    if (!Object.hasOwn(values, name)) {
      throw new Error(`Unknown placeholder ${placeholder}`);
    }

    return values[name];
  });
}
