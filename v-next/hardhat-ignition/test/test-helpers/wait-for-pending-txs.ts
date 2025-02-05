const sleep = (timeout: number) =>
  new Promise((res) => setTimeout(res, timeout));

/**
 * Wait until there are at least `expectedCount` transactions in the mempool
 */
export async function waitForPendingTxs(
  hre: any,
  expectedCount: number,
  finished: Promise<any>
): Promise<void> {
  let stopWaiting = false;
  finished.finally(() => {
    stopWaiting = true;
  });

  while (true) {
    if (stopWaiting) {
      return;
    }
    const pendingBlock = await hre.network.provider.send(
      "eth_getBlockByNumber",
      ["pending", false]
    );

    if (pendingBlock.transactions.length >= expectedCount) {
      return;
    }

    await sleep(50);
  }
}
