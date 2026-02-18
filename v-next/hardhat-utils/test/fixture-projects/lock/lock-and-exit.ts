import { MultiProcessMutex } from "../../../src/synchronization.js";

const lockPath = process.argv[2];

const mutex = new MultiProcessMutex(lockPath);

// eslint-disable-next-line no-restricted-syntax -- allow in test fixture
await mutex.acquire();

// Signal to parent that lock is acquired
process.stdout.write("LOCKED\n", () => {
  // Exit without releasing — the exit handler should clean up the lock directory
  process.exit(0);
});
