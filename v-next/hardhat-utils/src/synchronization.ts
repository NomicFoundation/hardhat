// Logic explanation: the fs.writeFile function, when used with the wx+ flag, performs an atomic operation to create a file.
// If multiple processes try to create the same file simultaneously, only one will succeed.
// This logic can be utilized to implement a mutex.
// ATTENTION: in the current implementation, there's still a risk of two processes running simultaneously.
// For example, if processA has locked the mutex and is running, processB will wait.
// During this wait, processB continuously checks the elapsed time since the mutex lock file was created.
// If an excessive amount of time has passed, processB will assume ownership of the mutex to prevent stale locks, even if processA is still running.
// As a result, two processes will be running simultaneously in what is theoretically a mutex-locked section.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import debug from "debug";

import { ensureNodeErrnoExceptionError } from "./error.js";
import { FileSystemAccessError } from "./errors/fs.js";
import { readUtf8File } from "./fs.js";
import { sleep } from "./lang.js";

const log = debug("hardhat:util:multi-process-mutex");
const DEFAULT_MAX_MUTEX_LIFESPAN_IN_MS = 60000;
const MUTEX_LOOP_WAITING_TIME_IN_MS = 100;

export class MultiProcessMutex {
  readonly #mutexFilePath: string;
  readonly #mutexLifespanInMs: number;

  constructor(mutexName: string, maxMutexLifespanInMs?: number) {
    log(`Creating mutex with name '${mutexName}'`);

    this.#mutexFilePath = path.join(os.tmpdir(), `${mutexName}.txt`);
    this.#mutexLifespanInMs =
      maxMutexLifespanInMs ?? DEFAULT_MAX_MUTEX_LIFESPAN_IN_MS;
  }

  public async use<T>(f: () => Promise<T>): Promise<T> {
    log(`Starting mutex process with mutex file '${this.#mutexFilePath}'`);

    while (true) {
      if (await this.#tryToAcquireMutex()) {
        // Mutex has been acquired
        return this.#executeFunctionAndReleaseMutex(f);
      }

      // Mutex not acquired
      if (this.#isMutexFileTooOld()) {
        // If the mutex file is too old, it likely indicates a stale lock, so the file should be removed
        log(
          `Current mutex file is too old, removing it at path '${this.#mutexFilePath}'`,
        );

        this.#deleteMutexFile();
      } else if (await this.#isMutexProcessOwnerDead()) {
        log(
          `The process owning the mutex file no longer exists. Removing mutex file at '${this.#mutexFilePath}'.`,
        );

        this.#deleteMutexFile();
      } else {
        // wait
        await sleep(MUTEX_LOOP_WAITING_TIME_IN_MS / 1000);
      }
    }
  }

  async #tryToAcquireMutex() {
    try {
      // Create a file only if it does not exist
      fs.writeFileSync(this.#mutexFilePath, process.pid.toString(), {
        flag: "wx+",
      });

      return true;
    } catch (e) {
      ensureNodeErrnoExceptionError(e);

      if (e.code === "EEXIST") {
        // File already exists, so the mutex is already acquired
        return false;
      }

      throw new FileSystemAccessError(e.message, e);
    }
  }

  async #executeFunctionAndReleaseMutex<T>(f: () => Promise<T>): Promise<T> {
    log(`Mutex acquired at path '${this.#mutexFilePath}'`);

    try {
      return await f();
    } finally {
      // Release the mutex
      // Note: if a process dies, its `finally` block never executes, and the process hangs indefinitely since no response is received.
      // To handle this, we use the function `isMutexProcessOwnerDead`.
      log(`Mutex released at path '${this.#mutexFilePath}'`);
      this.#deleteMutexFile();
      log(`Mutex released at path '${this.#mutexFilePath}'`);
    }
  }

  #isMutexFileTooOld(): boolean {
    let fileStat;
    try {
      fileStat = fs.statSync(this.#mutexFilePath);
    } catch (e) {
      ensureNodeErrnoExceptionError(e);

      if (e.code === "ENOENT") {
        // The file might have been deleted by another process while this function was trying to access it.
        return false;
      }

      throw new FileSystemAccessError(e.message, e);
    }

    const now = new Date();
    const fileDate = new Date(fileStat.ctime);
    const diff = now.getTime() - fileDate.getTime();

    return diff > this.#mutexLifespanInMs;
  }

  #deleteMutexFile() {
    try {
      log(`Deleting mutex file at path '${this.#mutexFilePath}'`);
      fs.unlinkSync(this.#mutexFilePath);
    } catch (e) {
      ensureNodeErrnoExceptionError(e);

      if (e.code === "ENOENT") {
        // The file might have been deleted by another process while this function was trying to access it.
        return;
      }

      throw new FileSystemAccessError(e.message, e);
    }
  }

  async #isMutexProcessOwnerDead(): Promise<boolean> {
    let mutexPid: string;

    try {
      // If the file doesn't exist, it means the owning process deleted it
      mutexPid = await readUtf8File(this.#mutexFilePath);
    } catch (_e) {
      return false;
    }

    try {
      process.kill(parseInt(mutexPid, 10), 0);
    } catch (e) {
      ensureNodeErrnoExceptionError(e);

      if (e.code === "ESRCH") {
        // The process owning the mutex no longer exists
        return true;
      }
    }

    return false;
  }
}
