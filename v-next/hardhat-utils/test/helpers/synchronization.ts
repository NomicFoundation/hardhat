import { MultiProcessMutex } from "../../src/synchronization.js";

export const TEST_MUTEX_NAME = "test-mutex";

const m = new MultiProcessMutex(TEST_MUTEX_NAME, 20_000);

// eslint-disable-next-line no-restricted-syntax -- allow in test
await m.use(async () => {
  await new Promise((resolve) => setTimeout(resolve, 10_000));
});
