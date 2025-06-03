import type {
  ContractAbis,
  ContractReturnType,
  HardhatViemHelpers,
} from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type {
  AbiEvent,
  ContractEventName,
  ReadContractReturnType,
  WriteContractReturnType,
} from "viem";

import assert from "node:assert/strict";

import { parseEventLogs } from "viem";

export async function handleEmit<
  ContractName extends keyof ContractAbis,
  EventName extends ContractEventName<ContractAbis[ContractName]>,
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  eventName: EventName,
): Promise<Array<{ args?: Record<string, any> }>> {
  const abiEvents: AbiEvent[] = contract.abi.filter(
    (item): item is AbiEvent =>
      item.type === "event" && item.name === eventName,
  );

  assert.ok(
    abiEvents.length !== 0,
    `Event "${eventName}" not found in the contract ABI`,
  );

  await contractFn;

  const publicClient = await viem.getPublicClient();

  const logs = await publicClient.getLogs({
    address: contract.address,
  });

  const parsedLogs = parseEventLogs({
    abi: contract.abi,
    eventName,
    logs,
  });

  assert.ok(
    parsedLogs.length > 0,
    `No events were emitted for contract with address "${contract.address}" and event name "${eventName}"`,
  );

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- logs generated from emitted events have the `args` field
  return parsedLogs as unknown as Array<{ args?: Record<string, any> }>;
}
