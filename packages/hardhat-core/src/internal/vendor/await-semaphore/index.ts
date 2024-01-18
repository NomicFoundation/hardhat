// Based on: https://github.com/notenoughneon/await-semaphore/blob/f117a6b59324038c9e8ee04c70c328215a727812/index.ts
// which is distributed under this license: https://github.com/notenoughneon/await-semaphore/blob/f117a6b59324038c9e8ee04c70c328215a727812/LICENSE

/* eslint-disable @nomicfoundation/hardhat-internal-rules/only-hardhat-error */
import * as fs from "fs";
import * as os from "os";
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
  public async use<T>(f: () => Promise<T>, mutexName?: string): Promise<T> {
    // Logic explanation: the fs.writeFile function, when used with the wx+ flag, performs an atomic operation to create a file.
    // If multiple processes try to create the same file simultaneously, only one will succeed.
    // This logic can be utilized to implement a mutex.
    const mutexFilePath = `${os.tmpdir()}/${
      mutexName ?? "multi-process-mutex"
    }.txt`;

    while (true) {
      if (await this._tryToAcquireMutex(mutexFilePath)) {
        // Mutex has been acquired
        try {
          // Execute the function passed to the mutex,
          // no other function will be able to run at the same time
          const res = await f();

          // Release the mutex
          this._deleteMutexFile(mutexFilePath);

          return res;
        } catch (error: any) {
          // Catch any error to avoid dead locks
          this._deleteMutexFile(mutexFilePath);
          throw error;
        }
      }

      // Mutex not acquired, wait and try again
      if (this._isMutexFileTooOld(mutexFilePath)) {
        // If the mutex file is too old, it likely indicates a deadlock, so the file should be removed
        this._deleteMutexFile(mutexFilePath);
        continue;
      }

      // wait
      await this._waitMs();
    }
  }

  private async _tryToAcquireMutex(mutexFilePath: string) {
    try {
      // Create a file only if it does not exist
      fs.writeFileSync(mutexFilePath, "", { flag: "wx+" });
      return true;
    } catch (error: any) {
      if (error.code === "EEXIST") {
        // File already exists, so the mutex is already acquired
        return false;
      }

      throw error;
    }
  }

  private _isMutexFileTooOld(mutexFilePath: string): boolean {
    const now = new Date();
    const fileStat = fs.statSync(mutexFilePath);
    const fileDate = new Date(fileStat.mtime);

    const diff = now.getTime() - fileDate.getTime();
    const diffInMinutes = Math.round(diff / 60000);

    return diffInMinutes > 5;
  }

  private _deleteMutexFile(mutexFilePath: string) {
    if (fs.existsSync(mutexFilePath)) {
      fs.unlinkSync(mutexFilePath);
    }
  }

  private async _waitMs() {
    const MS_TO_WAIT = 500;
    return new Promise((resolve) => setTimeout(resolve, MS_TO_WAIT));
  }
}
