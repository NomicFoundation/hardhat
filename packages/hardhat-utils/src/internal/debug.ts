import type { DebugLogger } from "../debug.js";

export const NOOP: DebugLogger = Object.assign(
  (_format: unknown, ..._args: unknown[]): void => {},
  { enabled: false },
);

/**
 * Wraps text with ANSI colour codes. Returns the text unchanged when `color`
 * is `undefined`.
 */
export function colorize(
  text: string,
  color: number | undefined,
  bold: boolean = false,
): string {
  if (color === undefined) {
    return text;
  }

  const ESC = "\x1b";
  const style = bold ? ";1" : "";
  return `${ESC}[3${color}${style}m${text}${ESC}[0m`;
}

/**
 * Parses a `DEBUG`-style pattern string into include/exclude regex lists.
 * Patterns prefixed with `-` go into `exclude`; everything else into `include`.
 */
export function parsePatterns(env: string): {
  include: RegExp[];
  exclude: RegExp[];
} {
  const include: RegExp[] = [];
  const exclude: RegExp[] = [];

  for (const raw of env.split(/[\s,]+/).filter((s) => s !== "")) {
    if (raw.startsWith("-")) {
      exclude.push(namespaceToRegExp(raw.slice(1)));
    } else {
      include.push(namespaceToRegExp(raw));
    }
  }

  return { include, exclude };
}

/**
 * Converts a `DEBUG`-style namespace pattern into an anchored regex.
 * Regex metacharacters are escaped to match literally, and `*` is translated
 * into `.*?` so it behaves as a glob wildcard.
 */
function namespaceToRegExp(namespace: string): RegExp {
  const escaped = namespace
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*?");

  return new RegExp(`^${escaped}$`);
}

/**
 * Checks whether a namespace is enabled under the given `DEBUG` pattern string.
 */
export function isEnabled(namespace: string, env: string): boolean {
  const { include, exclude } = parsePatterns(env);
  const matches = (pattern: RegExp) => pattern.test(namespace);

  return !exclude.some(matches) && include.some(matches);
}

/**
 * Picks an ANSI colour for a namespace, deterministic from its characters.
 *
 * Uses a djb2-style string hash folded into a 32-bit signed int, matching the
 * `debug` package's behaviour.
 */
export function selectColor(namespace: string): number {
  const COLORS = [6, 2, 3, 4, 5, 1];
  let hash = 0;

  for (let i = 0; i < namespace.length; i++) {
    // eslint-disable-next-line no-bitwise -- djb2 hash
    hash = ((hash << 5) - hash + namespace.charCodeAt(i)) | 0;
  }

  return COLORS[Math.abs(hash) % COLORS.length];
}

/**
 * Reports whether ANSI colours should be used, honouring `DEBUG_COLORS` and TTY.
 */
export function useColors(): boolean {
  const isDisabled =
    process.env.DEBUG_COLORS === "no" || process.env.DEBUG_COLORS === "false";

  return !isDisabled && process.stderr.isTTY === true;
}
