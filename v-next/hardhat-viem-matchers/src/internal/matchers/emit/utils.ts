import type { GenericFunction } from "../../../types.js";
import type {
  ContractReturnType,
  HardhatViemHelpers,
} from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type { Abi, ContractEventName } from "viem";

import assert from "node:assert/strict";

import { parseEventLogs } from "viem";

export async function checkEmitted<
  const ViemAbi extends Abi | readonly unknown[],
  ContractName,
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
  fn: GenericFunction,
  contract: ContractReturnType<ContractName>,
  eventName: ContractEventName<ViemAbi>,
): Promise<Array<{ args?: Record<string, any> }>> {
  await fn();

  const publicClient = await viem.getPublicClient();

  const logs = await publicClient.getLogs({
    address: contract.address,
  });

  const parsedLogs = parseEventLogs({
    abi: contract.abi,
    eventName,
    logs,
  });

  assert.notEqual(
    parsedLogs.length,
    0,
    `No events were emitted for contract with address "${contract.address}" and event name "${eventName}"`,
  );

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO
  return parsedLogs as unknown as Array<{ args?: Record<string, any> }>;
}
