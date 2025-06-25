import type { NetworkConnection } from "hardhat/types/network";

const sleep = (timeout: number) =>
  new Promise((res) => setTimeout(res, timeout));

/**
 * Wait until there are at least `expectedCount` transactions in the mempool
 */
export async function waitForPendingTxs(
  connection: NetworkConnection<string>,
  expectedCount: number,
  finished: Promise<any>,
): Promise<void> {
  let stopWaiting = false;
  void finished.finally(() => {
    stopWaiting = true;
  });

  while (true) {
    if (stopWaiting) {
      return;
    }

    const pendingBlock: any = await connection.provider.request({
      method: "eth_getBlockByNumber",
      params: ["pending", false],
    });

    if (pendingBlock.transactions.length >= expectedCount) {
      return;
    }

    await sleep(50);
  }
}
