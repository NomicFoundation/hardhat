// IMPORTANT: this file is duplicated verbatim at
// `packages/hardhat-utils/test/helpers/env.ts` because `hardhat-test-utils`
// depends on `hardhat-utils`, so the latter can't import from here. Any change
// to `createEnvChanges` / `createTestEnvManager` should be mirrored in that
// file.

import { afterEach } from "node:test";

export interface EnvChanges {
  /**
   * Sets an environment variable, saving its original value the first time it
   * is changed through this handle.
   */
  setEnvVar(name: string, value: string): void;

  /**
   * Removes an environment variable, saving its original value the first time
   * it is changed through this handle.
   *
   * Use it to shield a test from a variable that may be set in the developer's
   * or CI's environment, instead of deleting it outright: deleting doesn't
   * restore it afterwards, so every later test in the same file runs without it.
   */
  unsetEnvVar(name: string): void;

  /**
   * Restores every variable changed through this handle to the value it had
   * before the first change, and starts tracking again from scratch.
   */
  restoreEnvVars(): void;
}

/**
 * Tracks changes to `process.env` so that they can be undone, without
 * registering any test hook.
 *
 * Prefer {@link createTestEnvManager}, which undoes them after each test. Reach
 * for this one only when you need to control when the restore happens, like
 * inside a `before`/`after` pair or a `try`/`finally`.
 *
 * Only variables changed through the returned handle are tracked, so a raw
 * `process.env.FOO = "bar"` is still on its own.
 *
 * @example
 * ```ts
 * const changes = createEnvChanges();
 * changes.setEnvVar("FOO", "bar");
 * try {
 *   // ...
 * } finally {
 *   changes.restoreEnvVars();
 * }
 * ```
 */
export function createEnvChanges(): EnvChanges {
  const originalValues = new Map<
    string,
    { name: string; value: string | undefined }
  >();

  // On Windows environment variables are case-insensitive, so `https_proxy` and
  // `HTTPS_PROXY` are the same one and have to share a tracking entry. Without
  // this, changing both would record the second one as originally unset, and
  // the restore would put the original value back and then delete it again.
  function trackingKey(name: string): string {
    return process.platform === "win32" ? name.toUpperCase() : name;
  }

  // Saves the original value before the first change, as the restore reads
  // from it.
  function trackChange(name: string) {
    const key = trackingKey(name);

    if (!originalValues.has(key)) {
      originalValues.set(key, { name, value: process.env[name] });
    }
  }

  return {
    setEnvVar(name: string, value: string): void {
      trackChange(name);
      process.env[name] = value;
    },

    unsetEnvVar(name: string): void {
      trackChange(name);
      delete process.env[name];
    },

    restoreEnvVars(): void {
      originalValues.forEach(({ name, value }) => {
        if (value === undefined) {
          delete process.env[name];
        } else {
          process.env[name] = value;
        }
      });
      originalValues.clear();
    },
  };
}

export type TestEnvManager = Omit<EnvChanges, "restoreEnvVars">;

/**
 * Registers an `afterEach` hook that restores `process.env` to the values it
 * had before each test, and returns the handle used to change it.
 *
 * Only variables changed through the returned handle are tracked, so a raw
 * `process.env.FOO = "bar"` is still on its own.
 *
 * @example
 * ```ts
 * describe("foo", () => {
 *   const { setEnvVar, unsetEnvVar } = createTestEnvManager();
 *
 *   it("reads the variable", () => {
 *     setEnvVar("FOO", "bar");
 *     // ...
 *   });
 *
 *   it("works without it", () => {
 *     unsetEnvVar("FOO");
 *     // ...
 *   });
 * });
 * ```
 */
export function createTestEnvManager(): TestEnvManager {
  const changes = createEnvChanges();

  afterEach(() => {
    changes.restoreEnvVars();
  });

  return changes;
}
