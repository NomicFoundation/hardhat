// This function is used to wait for background operations to finish.
// It retries the assertion for given number of Event Loop turns.
export async function waitForAssert(
  maxEventLoopTurns: number,
  assert: () => void | Promise<void>
) {
  for (let i = 0; i < maxEventLoopTurns; i++) {
    await new Promise((resolve) => setImmediate(resolve));
    try {
      await assert();
    } catch (e) {
      if (i === maxEventLoopTurns - 1) {
        throw e;
      }
      continue;
    }
    return;
  }
}
