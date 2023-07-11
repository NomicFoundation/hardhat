import { assert } from "chai";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export const sleep = (timeout: number) =>
  new Promise((res) => setTimeout(res, timeout));

export function mineBlock(hre: HardhatRuntimeEnvironment): Promise<any> {
  return hre.network.provider.send("evm_mine");
}

export async function clearPendingTransactionsFromMemoryPool(
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const pendingBlockBefore = await hre.network.provider.send(
    "eth_getBlockByNumber",
    ["pending", false]
  );

  assert(
    pendingBlockBefore.transactions.length > 0,
    "Clearing an empty mempool"
  );

  for (const hash of pendingBlockBefore.transactions) {
    await hre.network.provider.request({
      method: "hardhat_dropTransaction",
      params: [hash],
    });
  }

  const pendingBlockAfter = await hre.network.provider.send(
    "eth_getBlockByNumber",
    ["pending", false]
  );

  assert(
    pendingBlockAfter.transactions.length === 0,
    "All blocks should be cleared"
  );
}
