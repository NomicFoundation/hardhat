import type { AbiHolder } from "../../abi-types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type {
  Abi,
  AbiEvent,
  ContractEventName,
  ReadContractReturnType,
  WriteContractReturnType,
} from "viem";

import assert from "node:assert/strict";

import { parseEventLogs } from "viem";

import { settle } from "../../helpers.js";

export async function handleEmit<
  TContract extends AbiHolder<Abi>,
  TEventName extends ContractEventName<TContract["abi"]>,
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: TContract,
  eventName: TEventName,
): Promise<Array<{ args?: Record<string, any> }>> {
  // Settle `contractFn` first so the tx doesn't leak into the next test, but
  // defer rethrowing so ABI errors still take precedence over tx reverts.
  const contractFnResult = await settle(contractFn);

  const abiEvents: AbiEvent[] = contract.abi.filter(
    (item): item is AbiEvent =>
      item.type === "event" && item.name === eventName,
  );

  assert.ok(
    abiEvents.length !== 0,
    `Event "${eventName}" not found in the contract ABI`,
  );

  if (contractFnResult.ok === false) {
    // eslint-disable-next-line no-restricted-syntax -- propagate the original tx-revert error
    throw contractFnResult.error;
  }

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
