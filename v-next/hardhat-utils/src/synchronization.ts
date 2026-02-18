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

const LOCK_METADATA_FILENAME = "lock-metadata.json";
const TEMP_FILE_PREFIX = `${LOCK_METADATA_FILENAME}.tmp-`;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_INITIAL_POLL_INTERVAL_MS = 5;
const MAX_POLL_INTERVAL_MS = 200;
const MISSING_METADATA_GRACE_MS = 50;

interface LockMetadata {
  pid: number;
  hostname: string;
  createdAt: number;
  uid?: number;
  platform: string;
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
 * This Mutex is implemented as directories created atomically via
 * `fs.mkdirSync(lockPath, { recursive: false })`. A JSON metadata file
 * (`lock-metadata.json`) is written inside the lock directory containing the
 * owner's PID, hostname, platform, uid, and creation timestamp. This metadata
 * enables stale lock detection.
 *
 * Staleness is determined by PID liveness only — timestamps are stored for
 * debugging purposes but are never used to determine staleness. This avoids the
 * clock-skew and long-running-task problems that time-based staleness detection
 * has (where a second process can break into a lock that's still legitimately
 * held).
 *
 * A very short grace window (based on directory birthtime) is applied on all
 * platforms when metadata is missing, to avoid falsely treating a just-created
 * lock as stale while metadata is still being written.
 *
 * Incompatible locks — those created by a different hostname, platform, or
 * uid — are rejected immediately with specific subclasses of
 * `IncompatibleMultiProcessMutexError`
 * (`IncompatibleHostnameMultiProcessMutexError`,
 * `IncompatiblePlatformMultiProcessMutexError`, or
 * `IncompatibleUidMultiProcessMutexError`) because their PID liveness cannot
 * be verified or their lock directory cannot be removed. These must be removed
 * manually.
 *
 * When the lock is held by a live process, the caller polls with exponential
 * backoff (default: 5ms → 10ms → ...  → 160ms → 200ms cap) until the lock is
 * released or a timeout (default: 60s) is reached.
 *
 * ## Performance characteristics
 *
 * - **Uncontended acquisition:** A single `mkdirSync` + metadata write — takes
 *   less than 1ms on most systems.
 * - **Stale lock recovery:** One `readFileSync` to read metadata, one
 *   `process.kill(pid, 0)` liveness check, and one `rmSync` to remove the
 *   stale directory before retrying acquisition. The retry is immediate (no
 *   sleep), so recovery adds sub-millisecond overhead.
 * - **Contended (live holder):** Polls with exponential backoff starting at
 *   5ms and doubling each iteration until capped at 200ms. Worst-case latency
 *   after the lock is released is up to `MAX_POLL_INTERVAL_MS` (200ms).
 * - **Release:** A single `rmSync` call.
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
 * - **PID recycling:** If a process dies and the OS reassigns its PID to a new
 *   unrelated process before the stale check runs, the lock is incorrectly
 *   considered live. This is extremely unlikely in practice due to the large
 *   PID space on modern systems.
 * - **No fairness guarantee:** Multiple waiters polling concurrently have no
 *   guaranteed ordering — whichever one calls `mkdirSync` first after the lock
 *   is released wins.
 */
export class MultiProcessMutex {
  readonly #mutexFolderPath: string;
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
    this.#mutexFolderPath = absolutePathToLock;

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
    log(
      `Starting mutex process with lock directory '${this.#mutexFolderPath}'`,
    );

    try {
      await this.#acquireLock();
    } catch (e) {
      ensureError(e);

      if (e instanceof BaseMultiProcessMutexError) {
        throw e;
      }

      throw new MultiProcessMutexError(this.#mutexFolderPath, e);
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

    await ensureDir(path.dirname(this.#mutexFolderPath));

    this.#cleanupOrphanedTempFiles();

    while (true) {
      const result = this.#tryAcquire();

      if (result.acquired) {
        return;
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= this.#timeout) {
        throw new MultiProcessMutexTimeoutError(
          this.#mutexFolderPath,
          this.#timeout,
        );
      }

      // Skip sleep after reclaiming a stale lock — retry immediately
      if (result.reclaimedStaleLock) {
        continue;
      }

      // Wait with exponential backoff
      log(
        `Lock at ${this.#mutexFolderPath} is busy, waiting ${pollInterval}ms`,
      );
      await sleep(pollInterval / 1000);

      // Exponential backoff, capped
      pollInterval = Math.min(pollInterval * 2, MAX_POLL_INTERVAL_MS);
    }
  }

  #releaseLock(): void {
    const lockPath = this.#mutexFolderPath;

    try {
      fs.rmSync(this.#metadataPath());
    } catch (e) {
      ensureNodeErrnoExceptionError(e);
      if (e.code === "ENOENT") {
        log(`Metadata file for lock at ${lockPath} already removed`);
      } else {
        throw new MultiProcessMutexError(lockPath, e);
      }
    }

    try {
      fs.rmdirSync(lockPath);
      log(`Released lock at ${lockPath}`);
    } catch (e) {
      ensureNodeErrnoExceptionError(e);
      if (e.code === "ENOENT") {
        // Already cleaned up
        log(`Lock at ${lockPath} already removed`);

        return;
      }

      if (e.code === "ENOTEMPTY") {
        // Another process re-acquired the lock between our metadata delete
        // and rmdir. This is safe — our critical section is already finished.
        log(
          `Lock at ${lockPath} was re-acquired by another process during release`,
        );
        // Fall through to activeLocks cleanup below
      } else {
        throw new MultiProcessMutexError(lockPath, e);
      }
    }
  }

  #tryAcquire(): AcquireResult {
    const lockPath = this.#mutexFolderPath;

    try {
      fs.mkdirSync(lockPath, { recursive: false });
    } catch (e) {
      ensureNodeErrnoExceptionError(e);

      if (e.code === "EEXIST") {
        // Lock directory already exists. Check staleness.
        const staleness = this.#checkStaleness();

        if (staleness.isStale) {
          const reclaimed = this.#tryUnlockingStaleLock(staleness.metadata);
          // After reclaim, retry from top (another process may have raced us)
          return { acquired: false, reclaimedStaleLock: reclaimed };
        }

        return { acquired: false, reclaimedStaleLock: false };
      }

      // We retry on permission errors, as this is a common transient failure
      // on Windows.
      if (e.code === "EPERM" || e.code === "EACCES") {
        log("Failed to acquire lock, retrying due to permission error");
        return { acquired: false, reclaimedStaleLock: false };
      }

      if (e.code === "ENOENT") {
        // Parent directory doesn't exist. Create it and retry.
        const parentDir = path.dirname(lockPath);
        log(`Parent directory ${parentDir} does not exist, creating it`);
        fs.mkdirSync(parentDir, { recursive: true });
        return { acquired: false, reclaimedStaleLock: false };
      }

      // Any other error (ENAMETOOLONG, ENOSPC, etc.)
      throw new MultiProcessMutexError(lockPath, e);
    }

    try {
      // Write metadata inside the lock directory
      this.#writeMetadata();
    } catch (e) {
      log("Failed to write metadata, cleaning up and rethrowing");

      try {
        this.#releaseLock();
      } catch (releaseError) {
        // Best-effort cleanup. If this fails, the next acquirer will
        // see missing/corrupt metadata and treat the lock as stale.
        log(
          "Failed to release lock during metadata write cleanup: %O",
          releaseError,
        );
      }

      // On Windows, mkdirSync can return before the directory is fully
      // visible to subsequent file operations. Treat ENOENT as a transient
      // failure and let the outer retry loop handle it.
      ensureNodeErrnoExceptionError(e);
      if (e.code === "ENOENT") {
        log(
          "Metadata write got ENOENT — likely a Windows directory flush delay, retrying",
        );
        return { acquired: false, reclaimedStaleLock: false };
      }

      if (e.code === "EPERM" || e.code === "EACCES") {
        log("Failed to acquire lock, retrying due to permission error");
        return { acquired: false, reclaimedStaleLock: false };
      }

      throw new MultiProcessMutexError(lockPath, e);
    }

    return { acquired: true };
  }

  #checkStaleness(): StalenessResult {
    const lockPath = this.#mutexFolderPath;
    const metadata = this.#readMetadata();

    if (metadata === undefined) {
      // On Windows, missing metadata can be transient right after mkdir.
      if (this.#isLockLikelyStillInitializing()) {
        log(
          `Lock at ${lockPath} has missing metadata but looks recently created; treating as busy`,
        );
        return { isStale: false };
      }

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
    const lockPath = this.#mutexFolderPath;

    try {
      fs.rmSync(this.#metadataPath());
    } catch (e) {
      ensureNodeErrnoExceptionError(e);
      if (e.code === "ENOENT") {
        log(`Metadata file for lock at ${lockPath} already removed`);
      } else {
        throw new MultiProcessMutexError(lockPath, e);
      }
    }

    try {
      fs.rmdirSync(lockPath);
      log(`Removed stale lock at ${lockPath}`);
    } catch (e) {
      ensureNodeErrnoExceptionError(e);

      if (e.code === "ENOENT") {
        // Already removed by another process — safe to retry acquisition
        log(`Stale lock at ${lockPath} already removed by another process`);
        return true;
      }

      if (e.code === "ENOTEMPTY") {
        // Directory is not empty. Check if another process re-acquired the
        // lock (wrote valid metadata) vs. something else blocking removal.
        const newMetadata = this.#readMetadata();
        if (newMetadata !== undefined) {
          // Another process re-acquired — return so the caller retries
          // and sees a live lock.
          log(
            `Stale lock at ${lockPath} was re-acquired by another process (PID=${newMetadata.pid})`,
          );
          return false;
        }

        // No valid metadata but directory is not empty. If the lock is very
        // recent on Windows, this can still be normal initialization. Treat as
        // busy and retry later. Otherwise, fail as stale-not-removable.
        if (this.#isLockLikelyStillInitializing()) {
          log(
            `Stale lock candidate at ${lockPath} is still initializing; treating as busy`,
          );
          return false;
        }

        throw new StaleMultiProcessMutexError(lockPath, metadata?.uid, e);
      }

      if (e.code === "EACCES" || e.code === "EPERM" || e.code === "EBUSY") {
        throw new StaleMultiProcessMutexError(lockPath, metadata?.uid, e);
      }

      throw new MultiProcessMutexError(lockPath, e);
    }

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

  #writeMetadata(): void {
    const metadata = this.#buildMetadata();
    const finalPath = this.#metadataPath();
    const contents = JSON.stringify(metadata, null, 2);

    // Write to a temporary file first, then rename it to the final path to
    // have an atomic metadata creation operation.
    const tempPath = path.join(
      path.dirname(this.#mutexFolderPath),
      `${TEMP_FILE_PREFIX}${process.pid}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
    );

    try {
      fs.writeFileSync(tempPath, contents, "utf8");
      fs.renameSync(tempPath, finalPath);
    } catch (e) {
      // Clean up the temp file to prevent orphaning it in the lock directory,
      // which would cause ENOTEMPTY during lock release and stale recovery.
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Best effort — file may not exist if writeFileSync failed before creating it
      }
      throw e;
    }
  }

  #cleanupOrphanedTempFiles(): void {
    const parentDir = path.dirname(this.#mutexFolderPath);

    let entries: string[];
    try {
      entries = fs.readdirSync(parentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.startsWith(TEMP_FILE_PREFIX)) {
        continue;
      }

      const afterPrefix = entry.slice(TEMP_FILE_PREFIX.length);
      const pidStr = afterPrefix.split("-")[0];
      const pid = Number(pidStr);

      if (!Number.isSafeInteger(pid) || pid < 1) {
        log(`Skipping orphaned temp file with invalid PID: ${entry}`);
        continue;
      }

      if (this.#isProcessAlive(pid)) {
        continue;
      }

      try {
        fs.unlinkSync(path.join(parentDir, entry));
        log(`Cleaned up orphaned temp file: ${entry}`);
      } catch (e) {
        log("Failed to clean up orphaned temp file %s: %O", entry, e);
      }
    }
  }

  #buildMetadata(): LockMetadata {
    return {
      pid: process.pid,
      hostname: os.hostname(),
      createdAt: Date.now(),
      ...(process.getuid !== undefined ? { uid: process.getuid() } : {}),
      platform: process.platform,
    };
  }

  #metadataPath(): string {
    return path.join(this.#mutexFolderPath, LOCK_METADATA_FILENAME);
  }

  #isLockLikelyStillInitializing(): boolean {
    try {
      const stat = fs.statSync(this.#mutexFolderPath);
      return Date.now() - stat.birthtimeMs <= MISSING_METADATA_GRACE_MS;
    } catch {
      return false;
    }
  }

  #readMetadata(): LockMetadata | undefined {
    try {
      const content = fs.readFileSync(this.#metadataPath(), "utf8");
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
            Number.isSafeInteger(parsed.uid) === false))
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
