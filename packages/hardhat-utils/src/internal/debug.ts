import type { DebugLogger } from "../debug.js";

export const NOOP: DebugLogger = Object.assign(
  (_format: unknown, ..._args: unknown[]): void => {},
  { enabled: false },
);

interface ParsedPatterns {
  include: RegExp[];
  exclude: RegExp[];
}

let cached: { env: string; parsed: ParsedPatterns } | undefined;

/**
 * Parses a `DEBUG`-style pattern string into include/exclude regex lists.
 * Patterns prefixed with `-` go into `exclude`; everything else into `include`.
 *
 * Results are memoized against the last-seen `env` string, since
 * `process.env.DEBUG` is effectively constant within a process and
 * `createDebug` is called many times at startup.
 */
export function parsePatterns(env: string): ParsedPatterns {
  if (cached !== undefined && cached.env === env) {
    return cached.parsed;
  }

  const include: RegExp[] = [];
  const exclude: RegExp[] = [];

  for (const raw of env.split(/[\s,]+/)) {
    if (raw === "") {
      continue;
    }
    if (raw.startsWith("-")) {
      exclude.push(namespaceToRegExp(raw.slice(1)));
    } else {
      include.push(namespaceToRegExp(raw));
    }
  }

  const parsed: ParsedPatterns = { include, exclude };
  cached = { env, parsed };
  return parsed;
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
  if (env === "") {
    return false;
  }

  const { include, exclude } = parsePatterns(env);

  return (
    !exclude.some((p) => p.test(namespace)) &&
    include.some((p) => p.test(namespace))
  );
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
