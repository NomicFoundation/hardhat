import type { NetworkConnection } from "@ignored/hardhat-vnext/types/network";

import { assert } from "chai";

export async function clearPendingTransactionsFromMemoryPool(
  connection: NetworkConnection,
): Promise<void> {
  const pendingBlockBefore = (await connection.provider.request({
    method: "eth_getBlockByNumber",
    params: ["pending", false],
  })) as any;

  assert(
    pendingBlockBefore.transactions.length > 0,
    "Clearing an empty mempool",
  );

  for (const hash of pendingBlockBefore.transactions) {
    await connection.provider.request({
      method: "hardhat_dropTransaction",
      params: [hash],
    });
  }

  const pendingBlockAfter = (await connection.provider.request({
    method: "eth_getBlockByNumber",
    params: ["pending", false],
  })) as any;

  assert(
    pendingBlockAfter.transactions.length === 0,
    "All blocks should be cleared",
  );
}
