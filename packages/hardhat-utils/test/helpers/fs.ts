// IMPORTANT: this file mirrors `packages/hardhat-test-utils/src/fs.ts`.
// `hardhat-test-utils` depends on `hardhat-utils`, so we can't import from
// there here — this would be a circular dependency. Any change to
// `createTmpDir` / `makeWorkspaceTmpDir` / `safeRemoveTmpDir` should be
// mirrored in the canonical file.

import fsPromises from "node:fs/promises";
import path from "node:path";
import { after, afterEach, before, beforeEach } from "node:test";

import { ensureDir, getRealPath, remove } from "../../src/fs.js";
import { findClosestPackageRoot } from "../../src/package.js";

// Local shim of `assertHardhatInvariant` from `@nomicfoundation/hardhat-errors`.
// We can't import that package here because it depends on `hardhat-utils`,
// which would form a circular dependency. The function body below uses this
// shim instead — that is the only intentional divergence from the canonical
// helper in `packages/hardhat-test-utils/src/fs.ts`.
function assertHardhatInvariant(
  invariant: boolean,
  message: string,
): asserts invariant {
  if (!invariant) {
    throw new Error(message);
  }
}

let workspaceRootCache: string | undefined;

async function getWorkspaceRoot(): Promise<string> {
  if (workspaceRootCache === undefined) {
    const testUtilsRoot = await findClosestPackageRoot(import.meta.url);
    workspaceRootCache = path.resolve(testUtilsRoot, "..", "..");
  }
  return workspaceRootCache;
}

/**
 * Creates a tmp directory inside `<workspace-root>/tmp/` and returns its
 * absolute (real) path.
 *
 * Putting tmp dirs inside the workspace (instead of `os.tmpdir()`) means
 * tools that resolve config by walking up from `cwd` — corepack, package
 * managers, `.npmrc`, and similar — see the workspace's settings.
 *
 * Note that the workspace's `package.json` sets `"type": "module"`, so any
 * `.js` file written into the tmp dir is treated as ESM by default. Tests
 * that download third-party CJS `.js` blobs into their tmp dir (e.g. solc's
 * WASM bundle) need to plant a `package.json` with `{"type":"commonjs"}`
 * inside their own tmp dir to opt out.
 *
 * Low-level helper used by `createTmpDir` and `useTestProjectTemplate`. Most
 * tests should use `createTmpDir` instead.
 */
export async function makeWorkspaceTmpDir(nameHint: string): Promise<string> {
  const root = await getWorkspaceRoot();
  const tmpBase = path.join(root, "tmp");
  await ensureDir(tmpBase);
  const tmpDir = await fsPromises.mkdtemp(path.join(tmpBase, `${nameHint}-`));
  // `mkdtemp` creates dirs with mode 0o700 (owner-only). Widen to the
  // conventional 0o755 directory mode so other users can traverse the tree.
  await fsPromises.chmod(tmpDir, 0o755);
  return await getRealPath(tmpDir);
}

/**
 * Removes a tmp directory previously created by `makeWorkspaceTmpDir`.
 *
 * Restores `process.cwd()` if it currently points inside the directory
 * (required on Windows so `rm` can unlink the tree), then logs and swallows
 * any error so a cleanup failure never fails a test.
 *
 * Low-level helper used by `createTmpDir` and `useTestProjectTemplate`.
 */
export async function safeRemoveTmpDir(tmpPath: string): Promise<void> {
  try {
    const cwd = process.cwd();
    if (cwd === tmpPath || cwd.startsWith(tmpPath + path.sep)) {
      process.chdir(path.dirname(tmpPath));
    }
    await remove(tmpPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Failed to remove temporary directory ${tmpPath}: ${message}`);
  }
}

/**
 * Creates a tmp directory inside `<workspace-root>/tmp/`, registers the
 * appropriate Node test-runner hooks to clean it up, and returns a handle
 * whose `.path` getter is valid inside `it`/`before`/`after`/`beforeEach`/
 * `afterEach` (it throws if accessed before the relevant hook has run).
 *
 * @param nameHint - A short string used as a prefix for the tmp directory
 *   name. Helps when reading on-disk paths during debugging.
 * @param scope - `"test"`: fresh dir per `it` via `beforeEach`/`afterEach`.
 *   `"describe"`: one shared dir for the whole describe via `before`/`after`.
 *
 * @example
 * ```ts
 * describe("foo", () => {
 *   const tmp = createTmpDir("foo", "test");
 *   it("writes a file", async () => {
 *     await writeUtf8File(path.join(tmp.path, "x"), "y");
 *   });
 * });
 * ```
 */
export function createTmpDir(
  nameHint: string,
  scope: "test" | "describe",
): { readonly path: string } {
  let tmpPath: string | undefined;

  const handle = {
    get path(): string {
      assertHardhatInvariant(
        tmpPath !== undefined,
        `createTmpDir("${nameHint}"): .path accessed before the dir was created. It is available inside it()/before()/after()/beforeEach()/afterEach() blocks.`,
      );
      return tmpPath;
    },
  };

  const create = async () => {
    tmpPath = await makeWorkspaceTmpDir(nameHint);
  };
  const cleanup = async () => {
    if (tmpPath !== undefined) {
      const toRemove = tmpPath;
      tmpPath = undefined;
      await safeRemoveTmpDir(toRemove);
    }
  };

  if (scope === "test") {
    beforeEach(create);
    afterEach(cleanup);
  } else {
    before(create);
    after(cleanup);
  }

  return handle;
}
