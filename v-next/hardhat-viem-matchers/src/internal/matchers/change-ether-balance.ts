import type { GenericFunction } from "../../types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";

export async function changeEtherBalance<ChainTypeT extends ChainType | string>(
  viem: HardhatViemHelpers<ChainTypeT>,
  fn: GenericFunction,
  address: any,
  amount: bigint,
): Promise<void> {
  const publicClient = await viem.getPublicClient();

  const balanceBefore = await publicClient.getBalance({
    address,
  });

  await fn();

  const balanceAfter = await publicClient.getBalance({
    address,
  });

  if (balanceBefore + amount !== balanceAfter) {
    // eslint-disable-next-line no-restricted-syntax -- TODO
    throw new Error(
      `Expected ${balanceBefore - amount} to equal ${balanceAfter}`,
    );
  }

  console.log(`a:${balanceBefore}\nb:${balanceAfter}`);
}
