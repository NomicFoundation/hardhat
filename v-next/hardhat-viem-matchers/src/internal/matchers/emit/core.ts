import type {
  ContractAbis,
  ContractReturnType,
  HardhatViemHelpers,
} from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type {
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

  assert.equal(
    parsedLogs.length > 0,
    true,
    `No events were emitted for contract with address "${contract.address}" and event name "${eventName}"`,
  );

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- logs generated from emitted events have the `args` field
  return parsedLogs as unknown as Array<{ args?: Record<string, any> }>;
}
