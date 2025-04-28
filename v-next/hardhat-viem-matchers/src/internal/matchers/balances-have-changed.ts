import type { GenericFunction } from "../../types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";

import assert from "node:assert/strict";

export async function balancesHaveChanged<
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
  fn: GenericFunction,
  changes: Array<{
    address: `0x${string}`;
    amount: bigint;
  }>,
): Promise<void> {
  const publicClient = await viem.getPublicClient();

  const preBalances = await Promise.all(
    changes.map(({ address }) => publicClient.getBalance({ address })),
  );

  await fn();

  const postBalances = await Promise.all(
    changes.map(({ address }) => publicClient.getBalance({ address })),
  );

  changes.forEach(({ address, amount }, index) => {
    const balanceBefore = preBalances[index];
    const balanceAfter = postBalances[index];

    assert.equal(
      balanceBefore + amount,
      balanceAfter,
      `For address "${address}", expected balance to change by ${amount} (from ${balanceBefore} to ${balanceBefore + amount}), but got ${balanceAfter} instead.`,
    );
  });
}
