import { expect } from "chai";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { MultiProcessMutex } from "../../src/internal/util/multi-process-mutex";

describe("multi-process-mutex", () => {
  const mutexName = "test-mutex";

  it("should execute all the function in a sequential order, not in parallel", async () => {
    // Since all the functions cannot be executed in parallel because of the mutex,
    // the total execution time should be bigger than the sum of the execution times of each function.
    const mutex = new MultiProcessMutex(mutexName); // Use default max mutex lifespan
    const start = performance.now();

    const ms = [500, 700, 1000];
    await Promise.all([
      mutex.use(async () => {
        await waitMs(ms[0]);
      }),
      mutex.use(async () => {
        await waitMs(ms[1]);
      }),

      mutex.use(async () => {
        await waitMs(ms[2]);
      }),
    ]);

    const end = performance.now();
    const duration = end - start;

    expect(duration).to.be.greaterThan(ms[0] + ms[1] + ms[2]);
  });

  it("should overwrite an old mutex file", async () => {
    const mutexLifeSpanMs = 800;
    const mutex = new MultiProcessMutex(mutexName, mutexLifeSpanMs);

    const start = performance.now();

    // Create a mutex file that should be overwritten by the next function because the file is too old
    const mutexFilePath = path.join(os.tmpdir(), `${mutexName}.txt`);
    fs.writeFileSync(mutexFilePath, "", { flag: "wx+" });

    const arr = [false];
    await mutex.use(async () => {
      arr[0] = true;
    });

    const end = performance.now();
    const duration = end - start;

    expect(arr[0] === true);
    expect(duration).to.be.greaterThan(mutexLifeSpanMs);
  });

  it("should overwrite the current mutex locked by another function because the function took to long to finish", async () => {
    const mutexLifeSpanMs = 500;
    const mutex = new MultiProcessMutex(mutexName, mutexLifeSpanMs);

    const res: number[] = [];

    await Promise.all([
      mutex.use(async () => {
        await waitMs(2000);
        res.push(1);
      }),
      new Promise((resolve) =>
        setTimeout(async () => {
          await mutex.use(async () => {
            await waitMs(200);
            res.push(2);
          });
          resolve(true);
        }, 200)
      ),
    ]);

    expect(res).to.deep.equal([2, 1]);
  });
});

async function waitMs(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}
