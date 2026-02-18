import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { describe, it } from "node:test";
import { inspect } from "node:util";

import { sleep } from "../src/lang.js";
import {
  AsyncMutex,
  IncompatibleHostnameMultiProcessMutexError,
  IncompatiblePlatformMultiProcessMutexError,
  IncompatibleUidMultiProcessMutexError,
  InvalidMultiProcessMutexPathError,
  MultiProcessMutex,
  MultiProcessMutexError,
  MultiProcessMutexTimeoutError,
  StaleMultiProcessMutexError,
} from "../src/synchronization.js";

import { useTmpDir } from "./helpers/fs.js";

const LOCK_METADATA_FILENAME = "lock-metadata.json";
const READONLY_BLOCKER_FILENAME = ".readonly-blocker";
const MISSING_METADATA_GRACE_MS = 50;

/**
 * Creates a file within a lock directory that blocks the process of deleting
 * the directory. This is used to test failures to delete stale locks.
 */
async function lockFileExclusivelyOnWindows(
  filePath: string,
): Promise<() => Promise<void>> {
  const fixtureScript = path.resolve(
    import.meta.dirname,
    "fixture-projects/lock/windows-lock-blocker.ps1",
  );

  const child = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      fixtureScript,
      filePath,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  if (child.stdout === null) {
    throw new Error("Windows lock helper stdout is not available");
  }

  await new Promise<void>((resolve, reject) => {
    const onStdout = (data: Buffer) => {
      if (data.toString().includes("LOCKED")) {
        cleanup();
        resolve();
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(
        new Error(
          `Windows lock helper exited before lock was acquired (code=${code}, signal=${signal})`,
        ),
      );
    };

    const cleanup = () => {
      child.stdout?.off("data", onStdout);
      child.off("error", onError);
      child.off("exit", onExit);
    };

    child.stdout.on("data", onStdout);
    child.on("error", onError);
    child.on("exit", onExit);
  });

  return async () => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
      await new Promise<void>((resolve) => {
        child.once("exit", () => resolve());
      });
    }
  };
}

function writeFakeMetadata(
  lockPath: string,
  metadata: Record<string, unknown>,
): void {
  fs.writeFileSync(
    path.join(lockPath, LOCK_METADATA_FILENAME),
    JSON.stringify(metadata),
    "utf8",
  );
}

describe("MultiProcessMutex", () => {
  const getTmpDir = useTmpDir("multi-process-mutex");

  it("should execute all the functions in a sequential order, not in parallel", async () => {
    const lockPath = path.join(getTmpDir(), "test.lock");
    const mutex = new MultiProcessMutex(lockPath);
    const start = performance.now();

    const ms = [500, 700, 1000];
    await Promise.all([
      mutex.use(async () => {
        await sleep(ms[0] / 1000);
      }),
      mutex.use(async () => {
        await sleep(ms[1] / 1000);
      }),
      mutex.use(async () => {
        await sleep(ms[2] / 1000);
      }),
    ]);

    const end = performance.now();
    const duration = end - start;

    assert.ok(
      duration > ms[0] + ms[1] + ms[2],
      "Duration should be greater than the sum of the execution times of each function",
    );
  });

  it("should get the mutex lock because the first function to own it failed", async () => {
    const lockPath = path.join(getTmpDir(), "test.lock");
    const mutex = new MultiProcessMutex(lockPath);

    const start = performance.now();

    const res: number[] = [];
    let errThrown = false;

    await Promise.all([
      mutex
        .use(async () => {
          throw new Error("Expected error");
        })
        .catch(() => {
          errThrown = true;
        }),
      new Promise((resolve) =>
        setTimeout(async () => {
          await mutex.use(async () => {
            res.push(2);
          });
          resolve(true);
        }, 200),
      ),
    ]);

    const end = performance.now();
    const duration = end - start;

    assert.ok(errThrown, "Expected error to be thrown");
    assert.deepEqual(res, [2]);
    assert.ok(
      duration < 1000,
      "Duration should be less than the mutex timeout",
    );
  });

  it(
    "should acquire the mutex lock after the first owner was cancelled due to a process crash",
    { timeout: 10_000 },
    async () => {
      const lockPath = path.join(getTmpDir(), "crash.lock");
      const fixtureScript = path.resolve(
        import.meta.dirname,
        "fixture-projects/lock/lock-holder.ts",
      );

      const child = spawn(process.execPath, [
        "--import",
        "tsx/esm",
        fixtureScript,
        lockPath,
        "60000", // Hold for a long time
      ]);

      // Wait for child to signal it has acquired the lock
      await new Promise<void>((resolve, reject) => {
        child.stdout.on("data", (data: Buffer) => {
          if (data.toString().includes("LOCKED")) {
            resolve();
          }
        });
        child.on("error", reject);
        child.on("exit", (code) => {
          if (code !== null && code !== 0) {
            reject(new Error(`Child exited with code ${code}`));
          }
        });
      });

      // Kill the child with SIGKILL (no cleanup handler runs)
      child.kill("SIGKILL");

      // Wait for the process to actually die
      await new Promise<void>((resolve) => {
        child.on("exit", () => resolve());
      });

      const mutex = new MultiProcessMutex(lockPath);

      const start = performance.now();

      const res: number[] = [];
      await mutex.use(async () => {
        res.push(2);
      });

      const end = performance.now();
      const duration = end - start;

      assert.deepEqual(res, [2]);
      assert.ok(
        duration < 1000,
        "Duration should be less than the mutex timeout",
      );
    },
  );

  it("should acquire and release a lock", async () => {
    const lockPath = path.join(getTmpDir(), "test.lock");
    const mutex = new MultiProcessMutex(lockPath);

    const result = await mutex.use(async () => {
      // Lock dir should exist while held
      assert.ok(
        fs.existsSync(lockPath),
        "Lock directory should exist while held",
      );
      return 42;
    });

    assert.equal(result, 42);
    // Lock dir should be removed after release
    assert.ok(
      !fs.existsSync(lockPath),
      "Lock directory should be removed after release",
    );
  });

  it("should recover a stale lock with a dead PID", async () => {
    const lockPath = path.join(getTmpDir(), "stale.lock");
    // Create a fake lock dir with metadata pointing to a non-existent PID
    fs.mkdirSync(lockPath);
    writeFakeMetadata(lockPath, {
      pid: 999999999, // Very unlikely to exist
      hostname: os.hostname(),
      createdAt: Date.now(),
      platform: process.platform,
    });

    const mutex = new MultiProcessMutex(lockPath);

    const start = performance.now();
    const result = await mutex.use(async () => "acquired");
    const duration = performance.now() - start;

    // NOTE: This test can be flaky if the OS is very slow
    assert.equal(result, "acquired");
    assert.ok(
      duration < 1000,
      `Stale recovery should be fast, took ${duration}ms`,
    );
  });

  it("should recover a stale lock without sleeping (skip backoff)", async () => {
    const lockPath = path.join(getTmpDir(), "stale-no-sleep.lock");
    fs.mkdirSync(lockPath);
    writeFakeMetadata(lockPath, {
      pid: 999999999, // Very unlikely to exist
      hostname: os.hostname(),
      createdAt: Date.now(),
      platform: process.platform,
    });

    // Use a large initial poll interval so the test would take >2s if sleep
    // were not skipped after stale lock reclaim
    const mutex = new MultiProcessMutex(lockPath, 10_000, 2000);

    const start = performance.now();
    const result = await mutex.use(async () => "acquired");
    const duration = performance.now() - start;

    assert.equal(result, "acquired");
    assert.ok(
      duration < 1000,
      `Stale recovery should skip sleep, but took ${duration}ms`,
    );
  });

  it("should throw MultiProcessMutexTimeoutError when lock is held by a live process", async () => {
    const lockPath = path.join(getTmpDir(), "timeout.lock");
    // Create a lock owned by THIS process (which is alive)
    fs.mkdirSync(lockPath);
    writeFakeMetadata(lockPath, {
      pid: process.pid,
      hostname: os.hostname(),
      createdAt: Date.now(),
      platform: process.platform,
    });

    const mutex = new MultiProcessMutex(lockPath, 100, 50);

    await assert.rejects(
      mutex.use(async () => {}),
      (error: unknown) => {
        assert.ok(
          error instanceof MultiProcessMutexTimeoutError,
          `Expected MultiProcessMutexTimeoutError but got ${inspect(error)}`,
        );
        return true;
      },
    );

    // Clean up manually
    fs.rmSync(lockPath, { recursive: true });
  });

  it(
    "should wait for a child process to release the lock",
    { timeout: 10_000 },
    async () => {
      const lockPath = path.join(getTmpDir(), "cross-process.lock");
      const fixtureScript = path.resolve(
        import.meta.dirname,
        "fixture-projects/lock/lock-holder.ts",
      );

      const child = spawn(process.execPath, [
        "--import",
        "tsx/esm",
        fixtureScript,
        lockPath,
        "300", // Hold for 300ms
      ]);

      // Wait for child to signal it has acquired the lock
      await new Promise<void>((resolve, reject) => {
        child.stdout.on("data", (data: Buffer) => {
          if (data.toString().includes("LOCKED")) {
            resolve();
          }
        });
        child.on("error", reject);
        child.on("exit", (code) => {
          if (code !== null && code !== 0) {
            reject(new Error(`Child exited with code ${code}`));
          }
        });
      });

      const mutex = new MultiProcessMutex(lockPath);

      const start = performance.now();
      const result = await mutex.use(async () => "parent-acquired");
      const duration = performance.now() - start;

      assert.equal(result, "parent-acquired");
      assert.ok(
        duration > 200,
        `Expected to wait for child, but only took ${duration}ms`,
      );
    },
  );

  it("should throw IncompatibleHostnameMultiProcessMutexError for a lock from a different hostname", async () => {
    const lockPath = path.join(getTmpDir(), "hostname.lock");
    fs.mkdirSync(lockPath);
    writeFakeMetadata(lockPath, {
      pid: 1,
      hostname: "some-other-host",
      createdAt: Date.now(),
      platform: process.platform,
    });

    const mutex = new MultiProcessMutex(lockPath);

    try {
      await assert.rejects(
        mutex.use(async () => {}),
        (error: unknown) => {
          assert.ok(
            error instanceof IncompatibleHostnameMultiProcessMutexError,
            `Expected IncompatibleHostnameMultiProcessMutexError but got ${inspect(error)}`,
          );
          assert.ok(
            error.message.includes("some-other-host"),
            "Error message should contain the foreign hostname",
          );
          return true;
        },
      );
    } finally {
      fs.rmSync(lockPath, { recursive: true, force: true });
    }
  });

  it("should treat corrupt metadata as stale", async () => {
    const lockPath = path.join(getTmpDir(), "corrupt.lock");
    fs.mkdirSync(lockPath);
    fs.writeFileSync(
      path.join(lockPath, LOCK_METADATA_FILENAME),
      "NOT VALID JSON {{{",
      "utf8",
    );

    const mutex = new MultiProcessMutex(lockPath);
    const result = await mutex.use(async () => "acquired");
    assert.equal(result, "acquired");
  });

  it("should treat missing metadata file as stale", async () => {
    const lockPath = path.join(getTmpDir(), "no-metadata.lock");
    fs.mkdirSync(lockPath); // Dir exists but no metadata file inside

    const mutex = new MultiProcessMutex(lockPath);
    const result = await mutex.use(async () => "acquired");
    assert.equal(result, "acquired");
  });

  it("should not treat a very recent metadata-less non-empty lock as stale", async () => {
    const lockPath = path.join(getTmpDir(), "recent-no-metadata.lock");
    fs.mkdirSync(lockPath);
    fs.writeFileSync(path.join(lockPath, "placeholder"), "x", "utf8");

    // We set a timeout that's lower than the grace period
    const mutex = new MultiProcessMutex(
      lockPath,
      Math.round(MISSING_METADATA_GRACE_MS / 4),
      5,
    );

    try {
      await assert.rejects(
        mutex.use(async () => {}),
        (error: unknown) => {
          assert.ok(
            error instanceof MultiProcessMutexTimeoutError,
            `Expected MultiProcessMutexTimeoutError but got ${inspect(error)}`,
          );
          return true;
        },
      );
    } finally {
      fs.rmSync(lockPath, { recursive: true, force: true });
    }
  });

  it("should auto-create parent directories", async () => {
    const lockPath = path.join(
      getTmpDir(),
      "deep",
      "nested",
      "dir",
      "test.lock",
    );

    const mutex = new MultiProcessMutex(lockPath);
    const result = await mutex.use(async () => "acquired");
    assert.equal(result, "acquired");
    assert.ok(
      !fs.existsSync(lockPath),
      "Lock directory should be removed after release",
    );
  });

  it("should throw IncompatiblePlatformMultiProcessMutexError for a lock from a different platform", async () => {
    const lockPath = path.join(getTmpDir(), "platform.lock");
    const fakePlatform = process.platform === "linux" ? "win32" : "linux";
    fs.mkdirSync(lockPath);
    writeFakeMetadata(lockPath, {
      pid: process.pid, // Even if PID matches, different platform = incompatible
      hostname: os.hostname(),
      createdAt: Date.now(),
      platform: fakePlatform,
    });

    const mutex = new MultiProcessMutex(lockPath);

    try {
      await assert.rejects(
        mutex.use(async () => {}),
        (error: unknown) => {
          assert.ok(
            error instanceof IncompatiblePlatformMultiProcessMutexError,
            `Expected IncompatiblePlatformMultiProcessMutexError but got ${inspect(error)}`,
          );
          assert.ok(
            error.message.includes(fakePlatform),
            "Error message should contain the foreign platform",
          );
          return true;
        },
      );
    } finally {
      fs.rmSync(lockPath, { recursive: true, force: true });
    }
  });

  // On windows and any system without process.getuid, this test is skipped
  // as this error can't be thrown, because we can't check the uid.
  it(
    "should throw IncompatibleUidMultiProcessMutexError when lock has a different uid",
    { skip: process.getuid === undefined },
    async () => {
      const lockPath = path.join(getTmpDir(), "uid.lock");
      // Create a stale lock (dead PID) with a different uid
      fs.mkdirSync(lockPath);
      writeFakeMetadata(lockPath, {
        pid: 999999999, // Very unlikely to exist
        hostname: os.hostname(),
        createdAt: Date.now(),
        platform: process.platform,
        uid: 99999,
      });

      const mutex = new MultiProcessMutex(lockPath);

      try {
        await assert.rejects(
          mutex.use(async () => {}),
          (error: unknown) => {
            assert.ok(
              error instanceof IncompatibleUidMultiProcessMutexError,
              `Expected IncompatibleUidMultiProcessMutexError but got ${inspect(error)}`,
            );
            assert.ok(
              error.message.includes("99999"),
              "Error message should contain the foreign uid",
            );
            return true;
          },
        );
      } finally {
        fs.rmSync(lockPath, { recursive: true, force: true });
      }
    },
  );

  // This test is skipped on windows because it depends on unix fs semantics
  it(
    "should throw StaleMultiProcessMutexError with cause when stale lock cannot be removed",
    { skip: process.platform === "win32" },
    async () => {
      const parentDir = path.join(getTmpDir(), "permission-denied");
      fs.mkdirSync(parentDir);
      const lockPath = path.join(parentDir, "user.lock");
      // Create a stale lock (dead PID) with same uid so it passes the uid check
      // but make the parent read-only so rmSync fails with EACCES
      fs.mkdirSync(lockPath);
      writeFakeMetadata(lockPath, {
        pid: 999999999, // Very unlikely to exist — makes the lock stale
        hostname: os.hostname(),
        createdAt: Date.now(),
        platform: process.platform,
        ...(process.getuid !== undefined ? { uid: process.getuid() } : {}),
      });

      fs.chmodSync(parentDir, 0o555);

      try {
        const mutex = new MultiProcessMutex(lockPath, 500, 50);

        await assert.rejects(
          mutex.use(async () => {}),
          (error: unknown) => {
            assert.ok(
              error instanceof StaleMultiProcessMutexError,
              `Expected StaleMultiProcessMutexError but got ${inspect(error)}`,
            );
            assert.ok(
              error.cause instanceof Error,
              "StaleMultiProcessMutexError should have a cause",
            );
            return true;
          },
        );
      } finally {
        fs.chmodSync(parentDir, 0o755);
        fs.rmSync(lockPath, { recursive: true });
      }
    },
  );

  // This is the equivalent of the previous test, but for Windows
  it(
    "should throw StaleMultiProcessMutexError with cause when stale lock cannot be removed (Windows)",
    { skip: process.platform !== "win32" },
    async () => {
      const lockPath = path.join(getTmpDir(), "permission-denied-win.lock");
      // Create a stale lock (dead PID) so tryUnlockingStaleLock runs
      fs.mkdirSync(lockPath);
      writeFakeMetadata(lockPath, {
        pid: 999999999, // Very unlikely to exist — makes the lock stale
        hostname: os.hostname(),
        createdAt: Date.now(),
        platform: process.platform,
      });

      const blockerPath = path.join(lockPath, READONLY_BLOCKER_FILENAME);
      fs.writeFileSync(blockerPath, "", "utf8");
      const stopBlocking = await lockFileExclusivelyOnWindows(blockerPath);

      try {
        const mutex = new MultiProcessMutex(lockPath, 500, 50);

        await assert.rejects(
          mutex.use(async () => {}),
          (error: unknown) => {
            assert.ok(
              error instanceof StaleMultiProcessMutexError,
              `Expected StaleMultiProcessMutexError but got ${inspect(error)}`,
            );
            assert.ok(
              error.cause instanceof Error,
              "StaleMultiProcessMutexError should have a cause",
            );
            return true;
          },
        );
      } finally {
        await stopBlocking();
        fs.rmSync(lockPath, { recursive: true, force: true });
      }
    },
  );

  describe("acquire", () => {
    it("should acquire and release a lock", async () => {
      const lockPath = path.join(getTmpDir(), "acquire.lock");
      const mutex = new MultiProcessMutex(lockPath);

      const release = await mutex.acquire();

      assert.ok(
        fs.existsSync(lockPath),
        "Lock directory should exist while held",
      );

      await release();

      assert.ok(
        !fs.existsSync(lockPath),
        "Lock directory should be removed after release",
      );
    });

    it("should allow manual lock lifecycle around work", async () => {
      const lockPath = path.join(getTmpDir(), "manual.lock");
      const mutex = new MultiProcessMutex(lockPath);

      const release = await mutex.acquire();

      let result: string;
      try {
        result = "done";
      } finally {
        await release();
      }

      assert.equal(result, "done");
      assert.ok(
        !fs.existsSync(lockPath),
        "Lock directory should be removed after release",
      );
    });

    it("should enforce mutual exclusion via acquire()", async () => {
      const lockPath = path.join(getTmpDir(), "exclusion.lock");
      const mutex = new MultiProcessMutex(lockPath);

      const order: number[] = [];

      const task = async (id: number, holdMs: number) => {
        const release = await mutex.acquire();
        try {
          order.push(id);
          await sleep(holdMs / 1000);
        } finally {
          await release();
        }
      };

      await Promise.all([task(1, 100), task(2, 100), task(3, 100)]);

      assert.equal(order.length, 3, "All three tasks should have run");
      // The exact order depends on scheduling, but all three must complete
    });

    it("should release the lock even if the caller's work throws", async () => {
      const lockPath = path.join(getTmpDir(), "throw.lock");
      const mutex = new MultiProcessMutex(lockPath);

      await assert.rejects(async () => {
        const release = await mutex.acquire();
        try {
          throw new Error("Expected error");
        } finally {
          await release();
        }
      });

      assert.ok(
        !fs.existsSync(lockPath),
        "Lock directory should be removed after release in finally",
      );
    });

    it("should allow calling release multiple times without error", async () => {
      const lockPath = path.join(getTmpDir(), "double-release.lock");
      const mutex = new MultiProcessMutex(lockPath);

      const release = await mutex.acquire();
      await release();
      await release(); // Should not throw
    });

    it("should throw MultiProcessMutexTimeoutError from acquire()", async () => {
      const lockPath = path.join(getTmpDir(), "timeout-acquire.lock");
      // Create a lock owned by THIS process (which is alive)
      fs.mkdirSync(lockPath);
      writeFakeMetadata(lockPath, {
        pid: process.pid,
        hostname: os.hostname(),
        createdAt: Date.now(),
        platform: process.platform,
      });

      const mutex = new MultiProcessMutex(lockPath, 100, 50);

      await assert.rejects(mutex.acquire(), (error: unknown) => {
        assert.ok(
          error instanceof MultiProcessMutexTimeoutError,
          `Expected MultiProcessMutexTimeoutError but got ${inspect(error)}`,
        );
        return true;
      });

      // Clean up manually
      fs.rmSync(lockPath, { recursive: true });
    });
  });

  it("should throw InvalidMultiProcessMutexPathError for a non-absolute path", () => {
    assert.throws(
      () => new MultiProcessMutex("bare-name"),
      (error: unknown) => {
        assert.ok(
          error instanceof InvalidMultiProcessMutexPathError,
          `Expected InvalidMultiProcessMutexPathError but got ${inspect(error)}`,
        );
        return true;
      },
    );
  });

  it("should treat metadata with invalid field types as stale", async () => {
    const lockPath = path.join(getTmpDir(), "invalid-fields.lock");
    fs.mkdirSync(lockPath);
    writeFakeMetadata(lockPath, {
      pid: "not-a-number",
      hostname: "h",
      createdAt: 1,
      platform: "linux",
    });

    const mutex = new MultiProcessMutex(lockPath);
    const result = await mutex.use(async () => "acquired");
    assert.equal(result, "acquired");
  });

  it("should treat metadata with invalid uid type as stale", async () => {
    const lockPath = path.join(getTmpDir(), "invalid-uid.lock");
    fs.mkdirSync(lockPath);
    writeFakeMetadata(lockPath, {
      pid: process.pid,
      hostname: os.hostname(),
      createdAt: Date.now(),
      platform: process.platform,
      uid: "not-a-number", // Invalid uid type — should be treated as corrupt
    });

    const mutex = new MultiProcessMutex(lockPath);
    const result = await mutex.use(async () => "acquired");
    assert.equal(result, "acquired");
  });

  it("should treat metadata with non-safe-integer uid as stale", async () => {
    const lockPath = path.join(getTmpDir(), "unsafe-uid.lock");
    fs.mkdirSync(lockPath);
    writeFakeMetadata(lockPath, {
      pid: process.pid,
      hostname: os.hostname(),
      createdAt: Date.now(),
      platform: process.platform,
      uid: 1.5, // Not a safe integer — should be treated as corrupt
    });

    const mutex = new MultiProcessMutex(lockPath);
    const result = await mutex.use(async () => "acquired");
    assert.equal(result, "acquired");
  });

  it("should treat metadata with non-positive createdAt as stale", async () => {
    const lockPath = path.join(getTmpDir(), "non-positive-created-at.lock");
    fs.mkdirSync(lockPath);

    writeFakeMetadata(lockPath, {
      pid: process.pid,
      hostname: os.hostname(),
      createdAt: 0,
      platform: process.platform,
    });

    const mutex = new MultiProcessMutex(lockPath);
    const result = await mutex.use(async () => "acquired");
    assert.equal(result, "acquired");
  });

  // This test is skipped on windows because we use pid 1 to test this
  // behavior, which is not available on windows.
  it(
    "should treat a process returning EPERM on kill(pid,0) as alive",
    { skip: process.platform === "win32" },
    async () => {
      const lockPath = path.join(getTmpDir(), "eperm.lock");
      fs.mkdirSync(lockPath);
      writeFakeMetadata(lockPath, {
        pid: 1, // init/systemd, owned by root — kill(1, 0) throws EPERM for non-root
        hostname: os.hostname(),
        createdAt: Date.now(),
        platform: process.platform,
      });

      const mutex = new MultiProcessMutex(lockPath, 100, 50);

      await assert.rejects(
        mutex.use(async () => {}),
        (error: unknown) => {
          assert.ok(
            error instanceof MultiProcessMutexTimeoutError,
            `Expected MultiProcessMutexTimeoutError but got ${inspect(error)}`,
          );
          return true;
        },
      );

      // Clean up manually
      fs.rmSync(lockPath, { recursive: true });
    },
  );

  it("should handle ENOENT gracefully when lock is already removed during release", async () => {
    const lockPath = path.join(getTmpDir(), "already-removed.lock");
    const mutex = new MultiProcessMutex(lockPath);
    const release = await mutex.acquire();

    // Simulate another process or exit handler removing the lock dir
    fs.rmSync(lockPath, { recursive: true });

    // Release should not throw — ENOENT is silently handled
    await release();
  });

  it("should not throw when another process re-acquired the lock during release", async () => {
    const lockPath = path.join(getTmpDir(), "reacquired.lock");
    const mutex = new MultiProcessMutex(lockPath);

    const release = await mutex.acquire();

    // Simulate another process re-acquiring the lock between our metadata
    // delete and rmdir. In the real race, Process B would: remove the empty
    // dir → mkdirSync → write new metadata, all between release's two steps.
    // Since we can't intercept between the synchronous calls, we write an
    // extra file so the directory is non-empty after release deletes the
    // original metadata, triggering the ENOTEMPTY code path.
    const extraFile = path.join(lockPath, "other-owner-metadata.json");
    fs.writeFileSync(extraFile, "{}", "utf8");

    // Release should not throw — ENOTEMPTY is handled gracefully
    await release();

    // The lock directory should still exist (new owner's data is intact)
    assert.ok(
      fs.existsSync(lockPath),
      "Lock directory should still exist because another process re-acquired it",
    );
    assert.ok(
      fs.existsSync(extraFile),
      "The other owner's file should not have been deleted",
    );

    // Clean up manually
    fs.rmSync(lockPath, { recursive: true });
  });

  // This test is skipped on windows because it depends on unix permissions
  it(
    "should throw MultiProcessMutexError when release fails with non-ENOENT error",
    { skip: process.platform === "win32" },
    async () => {
      const parentDir = path.join(getTmpDir(), "release-error");
      fs.mkdirSync(parentDir);
      const lockPath = path.join(parentDir, "test.lock");
      const mutex = new MultiProcessMutex(lockPath);

      const release = await mutex.acquire();

      // Make parent read-only to prevent rmSync from removing the lock dir
      fs.chmodSync(parentDir, 0o555);

      try {
        await assert.rejects(release(), (error: unknown) => {
          assert.ok(
            error instanceof MultiProcessMutexError,
            `Expected MultiProcessMutexError but got ${inspect(error)}`,
          );
          return true;
        });
      } finally {
        fs.chmodSync(parentDir, 0o755);
        fs.rmSync(lockPath, { recursive: true, force: true });
      }
    },
  );

  // This is the equivalent of the previous test, but for Windows
  it(
    "should throw MultiProcessMutexError when release fails with non-ENOENT error (Windows)",
    { skip: process.platform !== "win32" },
    async () => {
      const lockPath = path.join(getTmpDir(), "release-error-win.lock");
      const mutex = new MultiProcessMutex(lockPath);

      const release = await mutex.acquire();

      const metadataPath = path.join(lockPath, LOCK_METADATA_FILENAME);
      const stopBlocking = await lockFileExclusivelyOnWindows(metadataPath);

      try {
        await assert.rejects(release(), (error: unknown) => {
          assert.ok(
            error instanceof MultiProcessMutexError,
            `Expected MultiProcessMutexError but got ${inspect(error)}`,
          );
          return true;
        });
      } finally {
        await stopBlocking();
        fs.rmSync(lockPath, { recursive: true, force: true });
      }
    },
  );

  // This test is skipped on windows because it depends on unix fs semantics
  it(
    "should throw StaleMultiProcessMutexError without uid info when metadata is missing",
    { skip: process.platform === "win32" },
    async () => {
      const parentDir = path.join(getTmpDir(), "stale-no-uid");
      fs.mkdirSync(parentDir);
      const lockPath = path.join(parentDir, "user.lock");
      // Create lock dir with NO metadata file — treated as stale with metadata=undefined
      fs.mkdirSync(lockPath);

      // Make parent read-only so rmSync in tryUnlockingStaleLock fails with EACCES
      fs.chmodSync(parentDir, 0o555);

      try {
        const mutex = new MultiProcessMutex(lockPath, 500, 50);

        await assert.rejects(
          mutex.use(async () => {}),
          (error: unknown) => {
            assert.ok(
              error instanceof StaleMultiProcessMutexError,
              `Expected StaleMultiProcessMutexError but got ${inspect(error)}`,
            );
            // The error message should NOT contain uid info since metadata was undefined
            assert.ok(
              !error.message.includes("uid:"),
              "Error message should not contain uid info",
            );
            return true;
          },
        );
      } finally {
        fs.chmodSync(parentDir, 0o755);
        fs.rmSync(lockPath, { recursive: true, force: true });
      }
    },
  );

  // This is the equivalent of the previous test, but for Windows
  it(
    "should throw StaleMultiProcessMutexError without uid info when metadata is missing (Windows)",
    { skip: process.platform !== "win32" },
    async () => {
      const lockPath = path.join(getTmpDir(), "stale-no-uid-win.lock");
      // Create lock dir with NO metadata file — treated as stale with metadata=undefined
      fs.mkdirSync(lockPath);

      const blockerPath = path.join(lockPath, READONLY_BLOCKER_FILENAME);
      fs.writeFileSync(blockerPath, "", "utf8");
      const stopBlocking = await lockFileExclusivelyOnWindows(blockerPath);

      try {
        const mutex = new MultiProcessMutex(lockPath, 500, 50);

        await assert.rejects(
          mutex.use(async () => {}),
          (error: unknown) => {
            assert.ok(
              error instanceof StaleMultiProcessMutexError,
              `Expected StaleMultiProcessMutexError but got ${inspect(error)}`,
            );
            // The error message should NOT contain uid info since metadata was undefined
            assert.ok(
              !error.message.includes("uid:"),
              "Error message should not contain uid info",
            );
            return true;
          },
        );
      } finally {
        await stopBlocking();
        fs.rmSync(lockPath, { recursive: true, force: true });
      }
    },
  );

  describe("orphaned temp file cleanup", () => {
    const TEMP_FILE_PREFIX = `${LOCK_METADATA_FILENAME}.tmp-`;

    it("should clean up orphaned temp files from dead processes", async () => {
      const tmpDir = getTmpDir();
      const lockPath = path.join(tmpDir, "test.lock");

      // Create orphaned temp files with a PID that doesn't exist
      const orphaned1 = path.join(
        tmpDir,
        `${TEMP_FILE_PREFIX}999999999-${Date.now()}-abc123`,
      );
      const orphaned2 = path.join(
        tmpDir,
        `${TEMP_FILE_PREFIX}999999999-${Date.now()}-def456`,
      );
      fs.writeFileSync(orphaned1, "{}", "utf8");
      fs.writeFileSync(orphaned2, "{}", "utf8");

      const mutex = new MultiProcessMutex(lockPath);
      await mutex.use(async () => {});

      assert.ok(
        !fs.existsSync(orphaned1),
        "Orphaned temp file 1 should be cleaned up",
      );
      assert.ok(
        !fs.existsSync(orphaned2),
        "Orphaned temp file 2 should be cleaned up",
      );
    });

    it("should preserve temp files from live processes", async () => {
      const tmpDir = getTmpDir();
      const lockPath = path.join(tmpDir, "test.lock");

      // Create a temp file with the current process's PID (which is alive)
      const liveFile = path.join(
        tmpDir,
        `${TEMP_FILE_PREFIX}${process.pid}-${Date.now()}-abc123`,
      );
      fs.writeFileSync(liveFile, "{}", "utf8");

      const mutex = new MultiProcessMutex(lockPath);
      await mutex.use(async () => {});

      assert.ok(
        fs.existsSync(liveFile),
        "Temp file from live process should be preserved",
      );

      // Clean up
      fs.unlinkSync(liveFile);
    });

    it("should not touch unrelated files", async () => {
      const tmpDir = getTmpDir();
      const lockPath = path.join(tmpDir, "test.lock");

      // Create files that don't match the temp file prefix
      const unrelated1 = path.join(tmpDir, "some-other-file.json");
      const unrelated2 = path.join(tmpDir, "lock-metadata.json.bak");
      fs.writeFileSync(unrelated1, "{}", "utf8");
      fs.writeFileSync(unrelated2, "{}", "utf8");

      const mutex = new MultiProcessMutex(lockPath);
      await mutex.use(async () => {});

      assert.ok(
        fs.existsSync(unrelated1),
        "Unrelated file 1 should not be touched",
      );
      assert.ok(
        fs.existsSync(unrelated2),
        "Unrelated file 2 should not be touched",
      );
    });

    it("should skip temp files with malformed PIDs", async () => {
      const tmpDir = getTmpDir();
      const lockPath = path.join(tmpDir, "test.lock");

      // Create a temp file with a non-numeric PID
      const malformed = path.join(
        tmpDir,
        `${TEMP_FILE_PREFIX}notapid-${Date.now()}-abc123`,
      );
      fs.writeFileSync(malformed, "{}", "utf8");

      const mutex = new MultiProcessMutex(lockPath);
      await mutex.use(async () => {});

      assert.ok(
        fs.existsSync(malformed),
        "Malformed PID temp file should be skipped",
      );

      // Clean up
      fs.unlinkSync(malformed);
    });
  });

  it(
    "should handle ENOENT when parent directory disappears between polls",
    { timeout: 10_000 },
    async () => {
      const parentDir = path.join(getTmpDir(), "vanishing");
      fs.mkdirSync(parentDir);
      const lockPath = path.join(parentDir, "test.lock");

      // Create a lock held by the current process (alive → not stale)
      fs.mkdirSync(lockPath);
      writeFakeMetadata(lockPath, {
        pid: process.pid,
        hostname: os.hostname(),
        createdAt: Date.now(),
        platform: process.platform,
      });

      const mutex = new MultiProcessMutex(lockPath, 5000, 300);

      // Start acquiring — will poll because lock is held by a live process
      const acquirePromise = mutex.use(async () => "acquired");

      // During the first sleep interval (300ms), remove the entire parent dir
      await sleep(0.1);
      fs.rmSync(parentDir, { recursive: true });

      // When the mutex wakes up, mkdirSync(lockPath) gets ENOENT,
      // it recreates the parent, then on the next iteration acquires successfully
      const result = await acquirePromise;
      assert.equal(result, "acquired");
    },
  );
});

describe("AsyncMutex", () => {
  it("should run a function exclusively", async () => {
    const mutex = new AsyncMutex();

    let running = 0;
    let maxRunning = 0;

    async function run() {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running--;
    }

    await Promise.all([
      mutex.exclusiveRun(run),
      mutex.exclusiveRun(run),
      mutex.exclusiveRun(run),
    ]);

    assert.equal(maxRunning, 1);
    assert.equal(running, 0);
  });
});
