import type { GenericFunction } from "../../types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";

/**
 * Validates that the balance for each specified address has changed by the provided amount
 * after executing the given asynchronous function.
 *
 * @param {HardhatViemHelpers} viem - The viem instance used to access the public client.
 * @param {GenericFunction} fn - An asynchronous function to execute.
 * @param {Array<{ address: `0x${string}`; amount: bigint }>} changes - An array of objects where each object contains:
 *   - `address`: An address (0x-prefixed string).
 *   - `amount`: The expected change in balance (positive for increase, negative for decrease).
 *
 * @returns {Promise<void>} A promise that resolves if all expected balance changes occur, or rejects if any do not.
 */
export async function balancesHaveChanged(
  viem: HardhatViemHelpers,
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

    if (balanceBefore + amount !== balanceAfter) {
      // eslint-disable-next-line no-restricted-syntax -- TODO
      throw new Error(
        `For address ${address}, expected a change of ${amount} (from ${balanceBefore} to ${balanceBefore + amount}), but found ${balanceAfter}.`,
      );
    }
  });
}
