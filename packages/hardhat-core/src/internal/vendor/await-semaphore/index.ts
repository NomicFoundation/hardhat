// Based on: https://github.com/notenoughneon/await-semaphore/blob/f117a6b59324038c9e8ee04c70c328215a727812/index.ts
// which is distributed under this license: https://github.com/notenoughneon/await-semaphore/blob/f117a6b59324038c9e8ee04c70c328215a727812/LICENSE

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
import debug from "debug";
import fs from "node:fs";
import os from "os";

export class Semaphore {
  public count: number;
  private _tasks: Array<() => void> = [];

  constructor(count: number) {
    this.count = count;
  }

  public acquire() {
    return new Promise<() => void>((res) => {
      const task = () => {
        let released = false;
        res(() => {
          if (!released) {
            released = true;
            this.count++;
            this._sched();
          }
        });
      };
      this._tasks.push(task);
      if (process !== undefined && process.nextTick !== undefined) {
        process.nextTick(this._sched.bind(this));
      } else {
        setImmediate(this._sched.bind(this));
      }
    });
  }

  public use<T>(f: () => Promise<T>) {
    return this.acquire().then((release) => {
      return f()
        .then((res) => {
          release();
          return res;
        })
        .catch((err) => {
          release();
          throw err;
        });
    });
  }

  private _sched() {
    if (this.count > 0 && this._tasks.length > 0) {
      this.count--;
      const next = this._tasks.shift();
      if (next === undefined) {
        throw new Error("Unexpected undefined value in tasks list");
      }

      next();
    }
  }
}

export class Mutex extends Semaphore {
  constructor() {
    super(1);
  }
}

export class MultiProcessMutex {
  private _log: debug.Debugger;
  private _mutexFilePath: string;
  private _timeoutInMs: number;
  private _defaultTimeoutInMs = 20000;
  private _safeMarginInMs = 2000;
  private _mutexReleaseWaitingTimeInMs = 500;
  // Timeout logic explanation:
  // When the function passed to the mutex is executed, it must not take longer than _defaultTimeoutInMs.
  // If it exceeds this duration, the function is terminated, and the mutex is released.
  // In case the process running the function crashes, other processes waiting for the mutex can detect this
  // by checking the elapsed time since the mutex was acquired. This approach helps to avoid deadlock scenarios.
  // The _safeMarginInMs is employed here to ensure that waiting processes do not prematurely terminate the current mutex holder
  // before it reports an error for exceeding the allowed execution time.

  constructor(mutexName: string, timeoutInMs?: number) {
    this._log = debug("hardhat:await-semaphore:multi-process-mutex");

    this._log(`Creating mutex with name '${mutexName}'`);

    this._mutexFilePath = `${os.tmpdir()}/${mutexName}.txt`;
    this._timeoutInMs = timeoutInMs ?? this._defaultTimeoutInMs;
  }

  public async use<T>(f: () => Promise<T>): Promise<T> {
    // Logic explanation: the fs.writeFile function, when used with the wx+ flag, performs an atomic operation to create a file.
    // If multiple processes try to create the same file simultaneously, only one will succeed.
    // This logic can be utilized to implement a mutex.
    // For more info check the Nomic Notion page (internal link)
    this._log(
      `Starting mutex process withy mutex file '${this._mutexFilePath}'`
    );

    while (true) {
      if (await this._tryToAcquireMutex()) {
        // Mutex has been acquired
        return this._executeFunctionAndReleaseMutex(f);
      }

      // Mutex not acquired
      if (this._isMutexFileTooOld()) {
        // If the mutex file is too old, it likely indicates a deadlock, so the file should be removed
        this._log(
          `Current mutex file is too old, removing it at path '${this._mutexFilePath}'`
        );
        this._deleteMutexFile();
        continue;
      }

      // wait
      await this._waitMs();
    }
  }

  private async _tryToAcquireMutex() {
    try {
      // Create a file only if it does not exist
      fs.writeFileSync(this._mutexFilePath, "", { flag: "wx+" });
      return true;
    } catch (error: any) {
      if (error.code === "EEXIST") {
        // File already exists, so the mutex is already acquired
        return false;
      }

      throw error;
    }
  }

  private async _executeFunctionAndReleaseMutex<T>(
    f: () => Promise<T>
  ): Promise<T> {
    this._log(`Mutex acquired at path '${this._mutexFilePath}'`);

    // Set a timeout to ensure that the function does not take longer than the allowed time
    let timeoutHandle: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new Error(
            "The function's execution timed out while it had ownership of the mutex"
          )
        );
      }, this._defaultTimeoutInMs);
    });

    try {
      // Execute the function passed to the mutex, no other function will be able to run at the same time.
      // If the function will take more than the timeout, it will be terminated with an error and the mutex will be released.
      // Promise.race is used to race the timeoutPromise against the execution of fn().
      // Whichever completes first will be the outcome of Promise.race.
      return await Promise.race([f(), timeoutPromise]).then((result) => {
        clearTimeout(timeoutHandle);

        // Release the mutex
        this._deleteMutexFile();

        this._log(`Mutex released at path '${this._mutexFilePath}'`);

        return result;
      });
    } catch (error: any) {
      // Catch any error to avoid dead locks.
      // Remove the mutex file and re-throw the error
      this._deleteMutexFile();
      throw error;
    }
  }

  private _isMutexFileTooOld(): boolean {
    const now = new Date();

    let fileStat;
    try {
      fileStat = fs.statSync(this._mutexFilePath);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // The file might have been deleted by another process while this function was trying to access it.
        return false;
      }

      throw error;
    }

    const fileDate = new Date(fileStat.mtime);
    const diff = now.getTime() - fileDate.getTime();

    // Add a safe margin to ensure that if the current mutex hits the timeout, it will be able to raise an error
    return diff > this._timeoutInMs + this._safeMarginInMs;
  }

  private _deleteMutexFile() {
    try {
      this._log(`Deleting mutex file at path '${this._mutexFilePath}'`);
      fs.unlinkSync(this._mutexFilePath);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // The file might have been deleted by another process while this function was trying to access it.
        return;
      }

      throw error;
    }
  }

  private async _waitMs() {
    return new Promise((resolve) =>
      setTimeout(resolve, this._mutexReleaseWaitingTimeInMs)
    );
  }
}
