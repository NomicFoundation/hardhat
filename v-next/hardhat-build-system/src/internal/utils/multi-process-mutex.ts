/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import debug from "debug";

// Logic explanation: the fs.writeFile function, when used with the wx+ flag, performs an atomic operation to create a file.
// If multiple processes try to create the same file simultaneously, only one will succeed.
// This logic can be utilized to implement a mutex.
// ATTENTION: in the current implementation, there's still a risk of two processes running simultaneously.
// For example, if processA has locked the mutex and is running, processB will wait.
// During this wait, processB continuously checks the elapsed time since the mutex lock file was created.
// If an excessive amount of time has passed, processB will assume ownership of the mutex to avoid stale locks.
// However, there's a possibility that processB might take ownership because the mutex creation file is outdated, even though processA is still running
// For more info check the Nomic Notion page (internal link).

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
      } else {
        // wait
        await this.#waitMs();
      }
    }
  }

  async #tryToAcquireMutex() {
    try {
      // Create a file only if it does not exist
      fs.writeFileSync(this.#mutexFilePath, "", { flag: "wx+" });
      return true;
    } catch (error) {
      ensureError(error);
      if (!("code" in error) || typeof error.code !== "string") {
        throw error;
      }

      if (error.code === "EEXIST") {
        // File already exists, so the mutex is already acquired
        return false;
      }

      throw error;
    }
  }

  async #executeFunctionAndReleaseMutex<T>(f: () => Promise<T>): Promise<T> {
    log(`Mutex acquired at path '${this.#mutexFilePath}'`);

    try {
      const res = await f();

      // Release the mutex
      log(`Mutex released at path '${this.#mutexFilePath}'`);
      this.#deleteMutexFile();

      log(`Mutex released at path '${this.#mutexFilePath}'`);

      return res;
    } catch (error) {
      // Catch any error to avoid stale locks.
      // Remove the mutex file and re-throw the error
      this.#deleteMutexFile();
      throw error;
    }
  }

  #isMutexFileTooOld(): boolean {
    let fileStat;
    try {
      fileStat = fs.statSync(this.#mutexFilePath);
    } catch (error) {
      ensureError(error);
      if (!("code" in error) || typeof error.code !== "string") {
        throw error;
      }

      if (error.code === "ENOENT") {
        // The file might have been deleted by another process while this function was trying to access it.
        return false;
      }

      throw error;
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
    } catch (error) {
      ensureError(error);
      if (!("code" in error) || typeof error.code !== "string") {
        throw error;
      }

      if (error.code === "ENOENT") {
        // The file might have been deleted by another process while this function was trying to access it.
        return;
      }

      throw error;
    }
  }

  async #waitMs() {
    return new Promise((resolve) =>
      setTimeout(resolve, MUTEX_LOOP_WAITING_TIME_IN_MS),
    );
  }
}
