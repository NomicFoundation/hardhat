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

// `debug@4`'s 76-colour 256-palette with the red and red-orange families
// stripped, so red stays reserved for error output.
export const COLORS: readonly number[] = [
  20, 21, 26, 27, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 56, 57, 62, 63, 68,
  69, 74, 75, 76, 77, 78, 79, 80, 81, 92, 93, 98, 99, 112, 113, 128, 129, 134,
  135, 148, 149, 178, 179, 184, 185, 201, 214, 215, 220, 221,
];

/**
 * Picks an ANSI 256-colour code for a namespace, deterministic from its
 * characters.
 *
 * Uses a 32-bit FNV-1a hash followed by an xorshift finalizer. The finalizer
 * improves bit avalanche so the low bits used by `% COLORS.length`
 * distribute Hardhat's namespaces more evenly across the palette.
 */
export function selectColor(namespace: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < namespace.length; i++) {
    // eslint-disable-next-line no-bitwise -- FNV-1a hash
    hash ^= namespace.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  // xorshift finalizer for better avalanche on the low bits
  /* eslint-disable no-bitwise -- xorshift finalizer */
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  /* eslint-enable no-bitwise */

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
