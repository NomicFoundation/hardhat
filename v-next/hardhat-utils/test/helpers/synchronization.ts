import { MultiProcessMutex } from "../../src/synchronization.js";

const m = new MultiProcessMutex("test-mutex", 20_000);

// eslint-disable-next-line no-restricted-syntax -- allow in test
await m.use(async () => {
  await new Promise((resolve) => setTimeout(resolve, 10_000));
});
