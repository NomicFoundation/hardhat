import { readClosestPackageJson } from "./package.js";

/**
 * How a Hardhat project's TypeScript files (config, plugins, tasks, scripts and
 * tests) are loaded at runtime:
 *  - `"native"`: rely on Node.js' built-in type stripping. No transpiler is
 *    installed or registered.
 *  - `"tsx"`: register the `tsx` ESM loader to transpile TypeScript on the fly.
 */
export type TypescriptSupportMode = "native" | "tsx";

/**
 * The minimum Node.js version that strips TypeScript types by default, and thus
 * the floor for the `"native"` mode. Node.js enabled type stripping by default
 * in 22.18 (on the 22.x line) and 23.6.
 */
export const MIN_NATIVE_TS_NODE_VERSION: readonly number[] = [22, 18, 0];

/**
 * The mode used when a project doesn't declare `hardhat.typescriptSupport` in
 * its `package.json`.
 *
 * NOTE: This is the single migration flip point. While Hardhat 3 is pre-stable
 * it defaults to `"tsx"`, preserving the historical behavior. At the stable
 * release this flips to `"native"` (the breaking change), after which projects
 * that need transpilation must opt into `"tsx"` and install `tsx` themselves.
 */
export const DEFAULT_TYPESCRIPT_SUPPORT_MODE: TypescriptSupportMode = "tsx";

/**
 * Returns whether the given value is a valid `typescriptSupport` mode.
 */
export function isValidTypescriptSupportMode(
  value: unknown,
): value is TypescriptSupportMode {
  return value === "native" || value === "tsx";
}

/**
 * Reads the `hardhat.typescriptSupport` field from the closest `package.json`
 * to `projectRoot`, returning its raw value, or `undefined` if it's not set.
 *
 * The value is intentionally returned unvalidated so that callers can decide
 * how to react to an invalid value (e.g. throwing a domain-specific error).
 */
export async function readTypescriptSupportField(
  projectRoot: string,
): Promise<string | undefined> {
  const packageJson = await readClosestPackageJson(projectRoot);

  return packageJson.hardhat?.typescriptSupport;
}

/**
 * Returns whether the current runtime can strip TypeScript types natively.
 *
 * We feature-detect via `process.features.typescript` rather than sniffing the
 * Node.js version, so this correctly reflects flags like
 * `--no-experimental-strip-types` (which disables it on otherwise-capable Node)
 * and `--experimental-strip-types` (which enables it on 22.13–22.17).
 */
export function isNativeTypeStrippingAvailable(): boolean {
  const feature = process.features.typescript;

  return feature === "strip" || feature === "transform";
}

/**
 * Returns whether the current Node.js version is new enough to strip TypeScript
 * types by default. Used only to phrase the error message when native mode is
 * requested but unavailable; capability itself is feature-detected.
 */
export function isNodeNewEnoughForNativeTs(): boolean {
  try {
    const version = process.versions.node
      .split(".")
      .map((p) => parseInt(p, 10));

    for (let i = 0; i < MIN_NATIVE_TS_NODE_VERSION.length; i++) {
      if (version[i] > MIN_NATIVE_TS_NODE_VERSION[i]) {
        return true;
      }

      if (version[i] < MIN_NATIVE_TS_NODE_VERSION[i]) {
        return false;
      }
    }
  } catch {
    // If our parsing of the version fails we assume it's new enough.
    return true;
  }

  return true;
}
