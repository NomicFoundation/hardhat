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
