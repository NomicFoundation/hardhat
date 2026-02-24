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
  fs.writeFileSync(lockPath, JSON.stringify(metadata), "utf8");
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
      // Lock file should exist while held
      assert.ok(fs.existsSync(lockPath), "Lock file should exist while held");
      return 42;
    });

    assert.equal(result, 42);
    // Lock file should be removed after release
    assert.ok(
      !fs.existsSync(lockPath),
      "Lock file should be removed after release",
    );
  });

  it("should recover a stale lock with a dead PID", async () => {
    const lockPath = path.join(getTmpDir(), "stale.lock");
    // Create a fake lock file with metadata pointing to a non-existent PID
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
    fs.rmSync(lockPath, { force: true });
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
      fs.rmSync(lockPath, { force: true });
    }
  });

  it("should treat corrupt metadata as stale", async () => {
    const lockPath = path.join(getTmpDir(), "corrupt.lock");
    fs.writeFileSync(lockPath, "NOT VALID JSON {{{", "utf8");

    const mutex = new MultiProcessMutex(lockPath);
    const result = await mutex.use(async () => "acquired");
    assert.equal(result, "acquired");
  });

  it("should treat empty lock file as stale", async () => {
    const lockPath = path.join(getTmpDir(), "empty.lock");
    fs.writeFileSync(lockPath, "", "utf8");

    const mutex = new MultiProcessMutex(lockPath);
    const result = await mutex.use(async () => "acquired");
    assert.equal(result, "acquired");
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
      "Lock file should be removed after release",
    );
  });

  it("should throw IncompatiblePlatformMultiProcessMutexError for a lock from a different platform", async () => {
    const lockPath = path.join(getTmpDir(), "platform.lock");
    const fakePlatform = process.platform === "linux" ? "win32" : "linux";
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
      fs.rmSync(lockPath, { force: true });
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
        fs.rmSync(lockPath, { force: true });
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
      // but make the parent read-only so unlinkSync fails with EACCES
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
        fs.rmSync(lockPath, { force: true });
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
      writeFakeMetadata(lockPath, {
        pid: 999999999, // Very unlikely to exist — makes the lock stale
        hostname: os.hostname(),
        createdAt: Date.now(),
        platform: process.platform,
      });

      const stopBlocking = await lockFileExclusivelyOnWindows(lockPath);

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
        fs.rmSync(lockPath, { force: true });
      }
    },
  );

  describe("acquire", () => {
    it("should acquire and release a lock", async () => {
      const lockPath = path.join(getTmpDir(), "acquire.lock");
      const mutex = new MultiProcessMutex(lockPath);

      const release = await mutex.acquire();

      assert.ok(fs.existsSync(lockPath), "Lock file should exist while held");

      await release();

      assert.ok(
        !fs.existsSync(lockPath),
        "Lock file should be removed after release",
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
        "Lock file should be removed after release",
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
        "Lock file should be removed after release in finally",
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
      fs.rmSync(lockPath, { force: true });
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
      fs.rmSync(lockPath, { force: true });
    },
  );

  it("should handle ENOENT gracefully when lock is already removed during release", async () => {
    const lockPath = path.join(getTmpDir(), "already-removed.lock");
    const mutex = new MultiProcessMutex(lockPath);
    const release = await mutex.acquire();

    // Simulate lock file being removed externally
    fs.rmSync(lockPath);

    // Release should not throw — ENOENT is silently handled
    await release();
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

      // Make parent read-only to prevent unlinkSync from removing the lock file
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
        fs.rmSync(lockPath, { force: true });
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

      const stopBlocking = await lockFileExclusivelyOnWindows(lockPath);

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
        fs.rmSync(lockPath, { force: true });
      }
    },
  );

  // This test is skipped on windows because it depends on unix fs semantics
  it(
    "should throw StaleMultiProcessMutexError without uid info when metadata is corrupt",
    { skip: process.platform === "win32" },
    async () => {
      const parentDir = path.join(getTmpDir(), "stale-no-uid");
      fs.mkdirSync(parentDir);
      const lockPath = path.join(parentDir, "user.lock");
      // Create lock file with corrupt content — treated as stale with metadata=undefined
      fs.writeFileSync(lockPath, "corrupt", "utf8");

      // Make parent read-only so unlinkSync in tryUnlockingStaleLock fails with EACCES
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
        fs.rmSync(lockPath, { force: true });
      }
    },
  );

  // This is the equivalent of the previous test, but for Windows
  it(
    "should throw StaleMultiProcessMutexError without uid info when metadata is corrupt (Windows)",
    { skip: process.platform !== "win32" },
    async () => {
      const lockPath = path.join(getTmpDir(), "stale-no-uid-win.lock");
      // Create lock file with corrupt content — treated as stale with metadata=undefined
      fs.writeFileSync(lockPath, "corrupt", "utf8");

      const stopBlocking = await lockFileExclusivelyOnWindows(lockPath);

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
        fs.rmSync(lockPath, { force: true });
      }
    },
  );

  it(
    "should handle ENOENT when parent directory disappears between polls",
    { timeout: 10_000 },
    async () => {
      const parentDir = path.join(getTmpDir(), "vanishing");
      fs.mkdirSync(parentDir);
      const lockPath = path.join(parentDir, "test.lock");

      // Create a lock held by the current process (alive → not stale)
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

      // When the mutex wakes up, it detects ENOENT and recreates the parent,
      // then on the next iteration acquires successfully
      const result = await acquirePromise;
      assert.equal(result, "acquired");
    },
  );

  it("should accept old-format metadata without sessionId", async () => {
    const lockPath = path.join(getTmpDir(), "old-format.lock");
    // Old-format metadata: no sessionId field
    writeFakeMetadata(lockPath, {
      pid: 999999999, // Very unlikely to exist — stale
      hostname: os.hostname(),
      createdAt: Date.now(),
      platform: process.platform,
    });

    const mutex = new MultiProcessMutex(lockPath);
    const result = await mutex.use(async () => "acquired");
    assert.equal(result, "acquired");
  });

  it("should treat metadata with invalid sessionId type as stale", async () => {
    const lockPath = path.join(getTmpDir(), "invalid-sessionid.lock");
    writeFakeMetadata(lockPath, {
      pid: process.pid,
      hostname: os.hostname(),
      createdAt: Date.now(),
      platform: process.platform,
      sessionId: 12345, // Invalid type — should be treated as corrupt
    });

    const mutex = new MultiProcessMutex(lockPath);
    const result = await mutex.use(async () => "acquired");
    assert.equal(result, "acquired");
  });

  describe("temp file cleanup", () => {
    const DEAD_PID = 999999999;

    it("should clean up orphaned temp files from dead PIDs after acquisition", async () => {
      const lockPath = path.join(getTmpDir(), "cleanup.lock");
      const dir = path.dirname(lockPath);
      const baseName = path.basename(lockPath);

      // Create fake orphaned temp files from a dead PID
      const orphan1 = path.join(
        dir,
        `${baseName}.tmp-${DEAD_PID}-session1-1234-abc`,
      );
      const orphan2 = path.join(
        dir,
        `${baseName}.tmp-${DEAD_PID}-session2-5678-def`,
      );
      fs.writeFileSync(orphan1, "orphan1");
      fs.writeFileSync(orphan2, "orphan2");

      const mutex = new MultiProcessMutex(lockPath);
      await mutex.use(async () => {});

      assert.equal(fs.existsSync(orphan1), false, "orphan1 should be removed");
      assert.equal(fs.existsSync(orphan2), false, "orphan2 should be removed");
    });

    it("should NOT clean up temp files from live PIDs", async () => {
      const lockPath = path.join(getTmpDir(), "live-pid.lock");
      const dir = path.dirname(lockPath);
      const baseName = path.basename(lockPath);

      // Create a temp file using the current (live) PID
      const liveTmp = path.join(
        dir,
        `${baseName}.tmp-${process.pid}-livesession-1234-abc`,
      );
      fs.writeFileSync(liveTmp, "live");

      // Also create one from a dead PID
      const deadTmp = path.join(
        dir,
        `${baseName}.tmp-${DEAD_PID}-deadsession-5678-def`,
      );
      fs.writeFileSync(deadTmp, "dead");

      const mutex = new MultiProcessMutex(lockPath);
      await mutex.use(async () => {});

      assert.equal(
        fs.existsSync(liveTmp),
        true,
        "live PID temp file should still exist",
      );
      assert.equal(
        fs.existsSync(deadTmp),
        false,
        "dead PID temp file should be removed",
      );

      // Manual cleanup
      fs.unlinkSync(liveTmp);
    });

    it("should clean orphans during stale lock recovery with corrupt metadata", async () => {
      const lockPath = path.join(getTmpDir(), "corrupt.lock");
      const dir = path.dirname(lockPath);
      const baseName = path.basename(lockPath);

      // Create a corrupt lock file
      fs.writeFileSync(lockPath, "CORRUPT");

      // Create orphaned temp files from a dead PID
      const orphan = path.join(
        dir,
        `${baseName}.tmp-${DEAD_PID}-session-1234-abc`,
      );
      fs.writeFileSync(orphan, "orphan");

      const mutex = new MultiProcessMutex(lockPath);
      await mutex.use(async () => {});

      assert.equal(
        fs.existsSync(orphan),
        false,
        "orphan should be removed after stale recovery",
      );
    });

    it("should not touch unrelated files or other locks' temp files", async () => {
      const lockPath = path.join(getTmpDir(), "mylock.lock");
      const dir = path.dirname(lockPath);

      // Create an unrelated file
      const unrelated = path.join(dir, "some-other-file.txt");
      fs.writeFileSync(unrelated, "unrelated");

      // Create a temp file for a DIFFERENT lock name
      const otherLockTmp = path.join(
        dir,
        `other.lock.tmp-${DEAD_PID}-session-1234-abc`,
      );
      fs.writeFileSync(otherLockTmp, "other lock's temp");

      const mutex = new MultiProcessMutex(lockPath);
      await mutex.use(async () => {});

      assert.equal(
        fs.existsSync(unrelated),
        true,
        "unrelated file should still exist",
      );
      assert.equal(
        fs.existsSync(otherLockTmp),
        true,
        "other lock's temp file should still exist",
      );
    });

    it("should skip temp files with malformed/unparseable PIDs", async () => {
      const lockPath = path.join(getTmpDir(), "malformed.lock");
      const dir = path.dirname(lockPath);
      const baseName = path.basename(lockPath);

      // Create a temp file with an unparseable PID
      const malformed = path.join(
        dir,
        `${baseName}.tmp-notanumber-session-1234-abc`,
      );
      fs.writeFileSync(malformed, "malformed");

      const mutex = new MultiProcessMutex(lockPath);
      await mutex.use(async () => {});

      assert.equal(
        fs.existsSync(malformed),
        true,
        "malformed PID temp file should not be deleted",
      );
    });
  });
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
