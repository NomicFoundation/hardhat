import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import debug from "debug";

import { ensureError, ensureNodeErrnoExceptionError } from "./error.js";
import {
  BaseMultiProcessMutexError,
  IncompatibleHostnameMultiProcessMutexError,
  IncompatiblePlatformMultiProcessMutexError,
  IncompatibleUidMultiProcessMutexError,
  InvalidMultiProcessMutexPathError,
  MultiProcessMutexError,
  MultiProcessMutexTimeoutError,
  StaleMultiProcessMutexError,
} from "./errors/synchronization.js";
import { ensureDir } from "./fs.js";
import { sleep } from "./lang.js";

export {
  IncompatibleHostnameMultiProcessMutexError,
  IncompatibleMultiProcessMutexError,
  IncompatiblePlatformMultiProcessMutexError,
  IncompatibleUidMultiProcessMutexError,
  InvalidMultiProcessMutexPathError,
  MultiProcessMutexError,
  MultiProcessMutexTimeoutError,
  StaleMultiProcessMutexError,
} from "./errors/synchronization.js";

const log = debug("hardhat:util:multi-process-mutex");

const PROCESS_SESSION_ID = randomUUID();
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_INITIAL_POLL_INTERVAL_MS = 5;
const MAX_POLL_INTERVAL_MS = 200;

/**
 * Error codes indicating hard links are definitively unsupported on the
 * target filesystem. These cause immediate failure rather than retries.
 */
const HARD_LINK_UNSUPPORTED_CODES = new Set(["EOPNOTSUPP", "ENOTSUP", "EXDEV"]);

interface LockMetadata {
  pid: number;
  hostname: string;
  createdAt: number;
  uid?: number;
  platform: string;
  sessionId: string;
}

type StalenessResult =
  | { isStale: true; metadata: LockMetadata | undefined }
  | { isStale: false };

type AcquireResult =
  | { acquired: true }
  | { acquired: false; reclaimedStaleLock: boolean };

/**
 * A class that implements an inter-process mutex.
 *
 * This Mutex is implemented using hard-link-based atomic file creation. A
 * temporary file containing JSON metadata (PID, hostname, platform, uid,
 * session ID, and creation timestamp) is written first, then hard-linked to
 * the lock path via `fs.linkSync`. `linkSync` fails atomically with `EEXIST`
 * if the lock already exists, ensuring only one process can hold the lock at
 * a time.
 *
 * Staleness is determined by PID liveness only — timestamps are stored for
 * debugging purposes but are never used to determine staleness. This avoids the
 * clock-skew and long-running-task problems that time-based staleness detection
 * has (where a second process can break into a lock that's still legitimately
 * held).
 *
 * Incompatible locks — those created by a different hostname, platform, or
 * uid — are rejected immediately with specific subclasses of
 * `IncompatibleMultiProcessMutexError`
 * (`IncompatibleHostnameMultiProcessMutexError`,
 * `IncompatiblePlatformMultiProcessMutexError`, or
 * `IncompatibleUidMultiProcessMutexError`) because their PID liveness cannot
 * be verified or their lock file cannot be removed. These must be removed
 * manually.
 *
 * When the lock is held by a live process, the caller polls with exponential
 * backoff (default: 5ms → 10ms → ...  → 160ms → 200ms cap) until the lock is
 * released or a timeout (default: 60s) is reached.
 *
 * If the filesystem does not support hard links (e.g., certain network
 * filesystems), acquisition fails fast with a `MultiProcessMutexError` rather
 * than degrading into timeout-based retries.
 *
 * ## Performance characteristics
 *
 * - **Uncontended acquisition:** One temp file write + one `linkSync` — takes
 *   less than 1ms on most systems.
 * - **Stale lock recovery:** One `readFileSync` to read metadata, one
 *   `process.kill(pid, 0)` liveness check, and one `unlinkSync` to remove the
 *   stale lock file before retrying acquisition. The retry is immediate (no
 *   sleep), so recovery adds sub-millisecond overhead.
 * - **Contended (live holder):** Polls with exponential backoff starting at
 *   5ms and doubling each iteration until capped at 200ms. Worst-case latency
 *   after the lock is released is up to `MAX_POLL_INTERVAL_MS` (200ms).
 * - **Release:** A single `unlinkSync` call.
 *
 * ## Limitations
 *
 * - **Polling-based:** There is no filesystem notification; callers discover
 *   that the lock is free only on the next poll, so there can be up to 200ms
 *   of wasted wait time after the lock is released.
 * - **Not reentrant:** The same process (or even the same `MultiProcessMutex`
 *   instance) calling `use()` while already holding the lock will deadlock
 *   until the timeout fires.
 * - **Single-host, single-user only:** Encountering a lock from a different
 *   hostname throws `IncompatibleHostnameMultiProcessMutexError`, a different
 *   platform throws `IncompatiblePlatformMultiProcessMutexError`, and a
 *   different uid throws `IncompatibleUidMultiProcessMutexError`. All extend
 *   `IncompatibleMultiProcessMutexError`. This means the lock is not safe to
 *   use on shared/networked filesystems (e.g., NFS) where multiple hosts or
 *   users may access the same path.
 * - **Requires hard-link support:** The underlying filesystem must support
 *   `linkSync`. If hard links are unsupported, acquisition fails immediately
 *   with `MultiProcessMutexError`.
 * - **PID recycling:** If a process dies and the OS reassigns its PID to a new
 *   unrelated process before the stale check runs, the lock is incorrectly
 *   considered live. This is extremely unlikely in practice due to the large
 *   PID space on modern systems.
 * - **No fairness guarantee:** Multiple waiters polling concurrently have no
 *   guaranteed ordering — whichever one succeeds at `linkSync` first after the
 *   lock is released wins.
 */
export class MultiProcessMutex {
  readonly #lockFilePath: string;
  readonly #timeout: number;
  readonly #initialPollInterval: number;

  /**
   * Creates an inter-process mutex given an absolute path.
   *
   * @param absolutePathToLock The absolute path of the mutex.
   * @param timeout The max amount of time to spend trying to acquire the lock
   *  in milliseconds. Defaults to 60000.
   * @param initialPollInterval The initial poll interval in milliseconds.
   *  Defaults to 5.
   */
  constructor(
    absolutePathToLock: string,
    timeout?: number,
    initialPollInterval?: number,
  ) {
    if (!path.isAbsolute(absolutePathToLock)) {
      throw new InvalidMultiProcessMutexPathError(absolutePathToLock);
    }
    this.#lockFilePath = absolutePathToLock;

    this.#timeout = timeout ?? DEFAULT_TIMEOUT_MS;
    this.#initialPollInterval =
      initialPollInterval ?? DEFAULT_INITIAL_POLL_INTERVAL_MS;
  }

  /**
   * Runs the function f while holding the mutex, returning its result.
   *
   * @param f The function to run.
   * @returns The result of the function.
   */
  public async use<T>(f: () => Promise<T>): Promise<T> {
    const release = await this.acquire();

    try {
      return await f();
    } finally {
      await release();
    }
  }

  /**
   * Acquires the mutex, returning an async function to release it.
   * The function MUST be called after using the mutex.
   *
   * If this function throws, no cleanup is necessary — the lock was never
   * acquired.
   *
   * @returns The mutex's release function.
   */
  public async acquire(): Promise<() => Promise<void>> {
    log(`Starting mutex process with lock file '${this.#lockFilePath}'`);

    try {
      await this.#acquireLock();
    } catch (e) {
      ensureError(e);

      if (e instanceof BaseMultiProcessMutexError) {
        throw e;
      }

      throw new MultiProcessMutexError(this.#lockFilePath, e);
    }

    let released = false;

    return async () => {
      if (released) {
        return;
      }

      this.#releaseLock();
      released = true;
    };
  }

  async #acquireLock(): Promise<void> {
    const startTime = Date.now();
    let pollInterval = this.#initialPollInterval;

    await ensureDir(path.dirname(this.#lockFilePath));

    while (true) {
      const result = this.#tryAcquire();

      if (result.acquired) {
        return;
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= this.#timeout) {
        throw new MultiProcessMutexTimeoutError(
          this.#lockFilePath,
          this.#timeout,
        );
      }

      // Skip sleep after reclaiming a stale lock — retry immediately
      if (result.reclaimedStaleLock) {
        continue;
      }

      // Wait with exponential backoff
      log(`Lock at ${this.#lockFilePath} is busy, waiting ${pollInterval}ms`);
      await sleep(pollInterval / 1000);

      // Exponential backoff, capped
      pollInterval = Math.min(pollInterval * 2, MAX_POLL_INTERVAL_MS);
    }
  }

  #releaseLock(): void {
    try {
      fs.unlinkSync(this.#lockFilePath);
      log(`Released lock at ${this.#lockFilePath}`);
    } catch (e) {
      ensureNodeErrnoExceptionError(e);
      if (e.code === "ENOENT") {
        log(`Lock at ${this.#lockFilePath} already removed`);
        return;
      }
      throw new MultiProcessMutexError(this.#lockFilePath, e);
    }
  }

  #tryAcquire(): AcquireResult {
    const lockPath = this.#lockFilePath;

    // Fast path: if the lock file already exists, check staleness directly
    // without creating temp files. This is both an optimization for the
    // common contended case and is required for correct behavior when the
    // parent directory is read-only (stale locks can still be detected via
    // readFileSync even when file creation in the directory is blocked).
    //
    // Note: handleExistingLock() must be called outside the try/catch so
    // that errors like StaleMultiProcessMutexError propagate correctly.
    let lockExists = false;
    try {
      fs.accessSync(lockPath, fs.constants.F_OK);
      lockExists = true;
    } catch {
      // Lock doesn't exist (or can't be checked) — proceed to acquire
    }

    if (lockExists) {
      return this.#handleExistingLock();
    }

    // Lock doesn't appear to exist — try to acquire via temp file + hard link
    const metadata = this.#buildMetadata();
    const contents = JSON.stringify(metadata, null, 2);

    const randomSuffix = Math.random().toString(16).slice(2);
    const tempPath = `${lockPath}.tmp-${process.pid}-${PROCESS_SESSION_ID}-${Date.now()}-${randomSuffix}`;

    let tempFd: number | undefined;
    try {
      // Create temp file with exclusive flag to prevent collisions
      tempFd = fs.openSync(tempPath, "wx");
      fs.writeFileSync(tempFd, contents, "utf8");
      fs.closeSync(tempFd);
      tempFd = undefined;

      // Attempt atomic hard link to the lock path
      fs.linkSync(tempPath, lockPath);

      log(`Acquired lock at ${lockPath}`);

      // Best-effort cleanup of temp files left by dead processes.
      // We hold the lock, so only one process runs this at a time.
      this.#cleanupDeadProcessTempFiles();

      return { acquired: true };
    } catch (e) {
      ensureNodeErrnoExceptionError(e);

      if (e.code === "EEXIST") {
        // Lock was created between our accessSync and linkSync
        return this.#handleExistingLock();
      }

      if (e.code === "ENOENT") {
        // Parent directory doesn't exist. Create it and retry.
        const parentDir = path.dirname(lockPath);
        log(`Parent directory ${parentDir} does not exist, creating it`);
        fs.mkdirSync(parentDir, { recursive: true });
        return { acquired: false, reclaimedStaleLock: false };
      }

      // Hard links definitively unsupported — fail fast
      if (HARD_LINK_UNSUPPORTED_CODES.has(e.code ?? "")) {
        throw new MultiProcessMutexError(lockPath, e);
      }

      // We retry on permission errors, as this is a common transient failure
      // on Windows.
      if (e.code === "EPERM" || e.code === "EACCES") {
        log("Failed to acquire lock, retrying due to permission error");
        return { acquired: false, reclaimedStaleLock: false };
      }

      // Any other error (ENAMETOOLONG, ENOSPC, etc.)
      throw new MultiProcessMutexError(lockPath, e);
    } finally {
      // Close fd if still open (write or close failed)
      if (tempFd !== undefined) {
        try {
          fs.closeSync(tempFd);
        } catch {
          // Best effort
        }
      }

      // Always clean up the temp file
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Best effort — file may not exist if openSync failed
      }
    }
  }

  #handleExistingLock(): AcquireResult {
    const staleness = this.#checkStaleness();

    if (staleness.isStale) {
      const reclaimed = this.#tryUnlockingStaleLock(staleness.metadata);
      return { acquired: false, reclaimedStaleLock: reclaimed };
    }

    return { acquired: false, reclaimedStaleLock: false };
  }

  #checkStaleness(): StalenessResult {
    const lockPath = this.#lockFilePath;
    const metadata = this.#readMetadata();

    if (metadata === undefined) {
      log(
        `Lock at ${lockPath} has missing/corrupt metadata, treating as stale`,
      );
      return { isStale: true, metadata: undefined };
    }

    // Different hostname — can't verify PID remotely
    if (metadata.hostname !== os.hostname()) {
      throw new IncompatibleHostnameMultiProcessMutexError(
        lockPath,
        metadata.hostname,
        os.hostname(),
      );
    }

    // Different platform — can't verify PID across platforms
    if (metadata.platform !== process.platform) {
      throw new IncompatiblePlatformMultiProcessMutexError(
        lockPath,
        metadata.platform,
        process.platform,
      );
    }

    // Different uid — can't remove a lock owned by another user
    const currentUid = process.getuid?.();
    if (
      metadata.uid !== undefined &&
      currentUid !== undefined &&
      metadata.uid !== currentUid
    ) {
      throw new IncompatibleUidMultiProcessMutexError(
        lockPath,
        metadata.uid,
        currentUid,
      );
    }

    // PID liveness check
    if (!this.#isProcessAlive(metadata.pid)) {
      log(`Lock at ${lockPath} owned by dead process PID=${metadata.pid}`);
      return { isStale: true, metadata };
    }

    // Process is alive, lock is not stale
    return { isStale: false };
  }

  #tryUnlockingStaleLock(metadata: LockMetadata | undefined): boolean {
    const lockPath = this.#lockFilePath;

    try {
      fs.unlinkSync(lockPath);
      log(`Removed stale lock at ${lockPath}`);
    } catch (e) {
      ensureNodeErrnoExceptionError(e);

      if (e.code === "ENOENT") {
        // Already removed by another process — safe to retry acquisition
        log(`Stale lock at ${lockPath} already removed by another process`);
        return true;
      }

      if (e.code === "EACCES" || e.code === "EPERM" || e.code === "EBUSY") {
        throw new StaleMultiProcessMutexError(lockPath, metadata?.uid, e);
      }

      throw new MultiProcessMutexError(lockPath, e);
    }

    // Best-effort cleanup of orphaned temp files from dead processes
    this.#cleanupDeadProcessTempFiles();

    return true;
  }

  /**
   * Checks if a process with the given PID is alive using signal 0, which is
   * a platform-independent existence check supported on both POSIX and Windows.
   *
   * `ESRCH` means the process doesn't exist. `EPERM` means it exists but
   * belongs to another user — still alive.
   */
  #isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      ensureNodeErrnoExceptionError(e);
      if (e.code === "ESRCH") {
        return false; // Process does not exist
      }
      // EPERM means the process exists but we don't have permission to signal it
      return true;
    }
  }

  #buildMetadata(): LockMetadata {
    return {
      pid: process.pid,
      hostname: os.hostname(),
      createdAt: Date.now(),
      ...(process.getuid !== undefined ? { uid: process.getuid() } : {}),
      platform: process.platform,
      sessionId: PROCESS_SESSION_ID,
    };
  }

  #readMetadata(): LockMetadata | undefined {
    try {
      const content = fs.readFileSync(this.#lockFilePath, "utf8");
      const parsed: unknown = JSON.parse(content);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("pid" in parsed) ||
        !("hostname" in parsed) ||
        !("createdAt" in parsed) ||
        !("platform" in parsed) ||
        typeof parsed.pid !== "number" ||
        typeof parsed.hostname !== "string" ||
        typeof parsed.createdAt !== "number" ||
        typeof parsed.platform !== "string" ||
        Number.isSafeInteger(parsed.pid) === false ||
        parsed.pid < 1 ||
        Number.isSafeInteger(parsed.createdAt) === false ||
        parsed.createdAt < 1 ||
        ("uid" in parsed &&
          parsed.uid !== undefined &&
          (typeof parsed.uid !== "number" ||
            Number.isSafeInteger(parsed.uid) === false)) ||
        ("sessionId" in parsed && typeof parsed.sessionId !== "string")
      ) {
        return undefined;
      }

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- We just validated it
      return parsed as LockMetadata;
    } catch {
      // Missing file, corrupt JSON, permission error — all treated as "no valid metadata"
      return undefined;
    }
  }

  /**
   * Best-effort cleanup of orphaned temp files left by dead processes.
   *
   * Scans the parent directory for all temp files matching this lock's naming
   * pattern (`{baseName}.tmp-{pid}-...`), parses the PID from each filename,
   * and removes files whose PID is no longer alive. Files with unparseable
   * PIDs are left untouched (conservative — don't delete what we can't verify).
   *
   * This is safe because the class is single-host-only (cross-host usage
   * throws `IncompatibleHostnameMultiProcessMutexError`).
   */
  #cleanupDeadProcessTempFiles(): void {
    const parentDir = path.dirname(this.#lockFilePath);
    const baseName = path.basename(this.#lockFilePath);
    const prefix = `${baseName}.tmp-`;

    try {
      const entries = fs.readdirSync(parentDir);
      for (const entry of entries) {
        if (!entry.startsWith(prefix)) {
          continue;
        }

        // Parse PID from filename: {baseName}.tmp-{pid}-{sessionId}-{ts}-{rand}
        const afterPrefix = entry.slice(prefix.length);
        const pidStr = afterPrefix.split("-")[0];
        const pid = Number(pidStr);

        if (!Number.isSafeInteger(pid) || pid < 1) {
          // Can't verify liveness — leave file alone
          continue;
        }

        if (this.#isProcessAlive(pid)) {
          continue;
        }

        try {
          fs.unlinkSync(path.join(parentDir, entry));
          log(`Cleaned up orphaned temp file: ${entry}`);
        } catch {
          // Best effort
        }
      }
    } catch {
      // Best effort — parent directory may not be readable
    }
  }
}

/**
 * A class that implements an asynchronous mutex (mutual exclusion) lock.
 *
 * The mutex ensures that only one asynchronous operation can be executed at a time,
 * providing exclusive access to a shared resource.
 */
export class AsyncMutex {
  #acquired = false;
  readonly #queue: Array<() => void> = [];

  /**
   * Acquires the mutex, running the provided function exclusively,
   * and releasing it afterwards.
   *
   * @param f The function to run.
   * @returns The result of the function.
   */
  public async exclusiveRun<ReturnT>(
    f: () => ReturnT,
  ): Promise<Awaited<ReturnT>> {
    const release = await this.#acquire();

    try {
      return await f();
    } finally {
      await release();
    }
  }

  /**
   * Acquires the mutex, returning a function that releases it.
   */
  async #acquire(): Promise<() => Promise<void>> {
    if (!this.#acquired) {
      this.#acquired = true;
      return async () => {
        this.#acquired = false;
        const next = this.#queue.shift();
        if (next !== undefined) {
          next();
        }
      };
    }

    return new Promise<() => Promise<void>>((resolve) => {
      this.#queue.push(() => {
        resolve(this.#acquire());
      });
    });
  }
}
