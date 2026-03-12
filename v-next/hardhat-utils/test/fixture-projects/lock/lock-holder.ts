import { sleep } from "../../../src/lang.js";
import { MultiProcessMutex } from "../../../src/synchronization.js";

const lockPath = process.argv[2];
const holdTimeMs = parseInt(process.argv[3] ?? "10000", 10);

const mutex = new MultiProcessMutex(lockPath);

// eslint-disable-next-line no-restricted-syntax -- allow in test fixture
await mutex.use(async () => {
  // Signal to parent that lock is acquired
  process.stdout.write("LOCKED\n");

  // Hold the lock for the specified duration
  await sleep(holdTimeMs / 1000);
});
