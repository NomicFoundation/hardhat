// Version arithmetic for deciding what to publish to Verdaccio.

/**
 * A semver `major.minor.patch`, with any prerelease or build metadata dropped.
 */
export type SemverCore = [number, number, number];

const NPM_REGISTRY_URL = "https://registry.npmjs.org";

const HTTP_NOT_FOUND = 404;
const HTTP_REQUEST_TIMEOUT = 408;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR = 500;

const NPM_FETCH_ATTEMPTS = 6;
/** Doubled per attempt up to the cap, so six attempts span about a minute. */
const NPM_FETCH_RETRY_DELAY_MS = 1_000;
const NPM_FETCH_MAX_RETRY_DELAY_MS = 30_000;
const NPM_FETCH_TIMEOUT_MS = 30_000;

/**
 * `major.minor.patch`, rejecting what `Number` would otherwise coerce.
 *
 * Each component is a single zero or a leading non-zero digit, as semver
 * requires. `Number` would read `01` as `1` and silently renumber the version.
 */
const SEMVER_CORE_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function stripBuildMetadata(version: string): string {
  return version.split("+", 1)[0];
}

export function parseCore(version: string): SemverCore {
  const core = stripBuildMetadata(version).split("-", 1)[0];

  if (!SEMVER_CORE_PATTERN.test(core)) {
    throw new Error(`Unparseable version: ${version}`);
  }

  const [major, minor, patch] = core.split(".").map(Number);

  return [major, minor, patch];
}

/** Whether `version` carries no prerelease tag. */
export function isRelease(version: string): boolean {
  return parseCore(version).join(".") === stripBuildMetadata(version);
}

export function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = parseCore(a);
  const [bMajor, bMinor, bPatch] = parseCore(b);

  return aMajor - bMajor || aMinor - bMinor || aPatch - bPatch;
}

/**
 * The next patch release after `version`, always a release version itself.
 *
 * Scenarios pull plugins whose `peerDependencies` use ranges like
 * `hardhat@^3.8.0`. node-semver excludes prereleases from such ranges.
 */
export function patchBump(version: string): string {
  const [major, minor, patch] = parseCore(version);

  return `${major}.${minor}.${patch + 1}`;
}

/**
 * The next minor release after `version`, always a release version itself.
 *
 * This is what a local build is raised to, so that it survives a release
 * landing on npm mid-run. A patch release loses to it outright. The next
 * minor release collides with it, and Verdaccio keeps the copy it already
 * holds.
 */
export function minorBump(version: string): string {
  const [major, minor] = parseCore(version);

  return `${major}.${minor + 1}.0`;
}

/** Seams for the tests; production callers take the defaults. */
export interface NpmFetchOptions {
  fetch?: typeof globalThis.fetch;
  retryDelayMs?: number;
}

/**
 * The `latest` release of `pkg` on the public npm registry, or `undefined`
 * when it has never been released there.
 *
 * Keep this pinned to the public registry, and keep `.npmrc` and
 * `npm_config_registry` from reaching it. Verdaccio merges its own contents
 * into what it reports, so asking it would fold the answer back on itself.
 *
 * Keep every failure but a 404 fatal. A floor computed without npm lets the
 * uplink silently outrank the local build.
 */
export async function npmLatestVersion(
  pkg: string,
  options: NpmFetchOptions = {},
): Promise<string | undefined> {
  const url = `${NPM_REGISTRY_URL}/${pkg}/latest`;
  const release = await getJson(url, options);

  if (release === undefined) {
    return undefined;
  }

  const version =
    typeof release === "object" && release !== null
      ? (release as { version?: unknown }).version
      : undefined;

  if (typeof version !== "string" || version === "") {
    throw new Error(`GET ${url} returned no version`);
  }

  return version;
}

/**
 * Fetch and parse `url`, or `undefined` when npm answers 404.
 *
 * A publish runs this once per workspace package, so a single blip would
 * otherwise abort a benchmark hours in. Retry the transient failures, and keep
 * a persistent one fatal.
 */
async function getJson(
  url: string,
  options: NpmFetchOptions,
): Promise<unknown> {
  const request = options.fetch ?? globalThis.fetch;
  const retryDelayMs = options.retryDelayMs ?? NPM_FETCH_RETRY_DELAY_MS;

  for (let attempt = 1; ; attempt++) {
    // A rejected request is worth another attempt; a refused one is not.
    let transient = true;

    try {
      const response = await request(url, {
        signal: AbortSignal.timeout(NPM_FETCH_TIMEOUT_MS),
      });

      if (response.status === HTTP_NOT_FOUND) {
        await response.body?.cancel();

        return undefined;
      }

      if (!response.ok) {
        await response.body?.cancel();

        transient =
          response.status === HTTP_REQUEST_TIMEOUT ||
          response.status === HTTP_TOO_MANY_REQUESTS ||
          response.status >= HTTP_SERVER_ERROR;

        throw new Error(`GET ${url} failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (!transient || attempt >= NPM_FETCH_ATTEMPTS) {
        throw error;
      }

      await sleep(
        Math.min(
          retryDelayMs * 2 ** (attempt - 1),
          NPM_FETCH_MAX_RETRY_DELAY_MS,
        ),
      );
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}
