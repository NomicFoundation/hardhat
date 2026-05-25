import type { AbiHolder } from "../../../abi-types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type { Abi, AbiEvent, ContractEventName, Hash } from "viem";

import assert from "node:assert/strict";

import { parseEventLogs, isHash } from "viem";

import { settle } from "../../helpers.js";

export async function handleEmit<
  TContract extends AbiHolder<Abi>,
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
  txHash: Hash | Promise<Hash>,
  contract: TContract,
  eventName: ContractEventName<TContract["abi"]>,
): Promise<Array<{ args?: Record<string, any> }>> {
  // Settle `txHash` first so the tx doesn't leak into the next test, but
  // defer rethrowing so ABI errors still take precedence over tx reverts.
  const txHashResult = await settle(txHash);

  if (txHashResult.ok === true) {
    assert.ok(
      isHash(txHashResult.value),
      `txHash must be a transaction hash or a promise resolving to one, but got: ${String(
        txHashResult.value,
      )}`,
    );
  }

  const abiEvents: AbiEvent[] = contract.abi.filter(
    (item): item is AbiEvent =>
      item.type === "event" && item.name === eventName,
  );

  assert.ok(
    abiEvents.length !== 0,
    `Event "${eventName}" not found in the contract ABI`,
  );

  if (txHashResult.ok === false) {
    // eslint-disable-next-line no-restricted-syntax -- propagate the original tx-revert error
    throw txHashResult.error;
  }

  const publicClient = await viem.getPublicClient();

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHashResult.value,
  });

  // `receipt.logs` includes logs from every contract touched by the tx; keep
  // only the ones emitted by the contract under test so an event with a
  // colliding signature from a different contract can't satisfy the assertion.
  const contractAddress = contract.address.toLowerCase();
  const ownLogs = receipt.logs.filter(
    (log) => log.address.toLowerCase() === contractAddress,
  );

  const parsedLogs = parseEventLogs({
    abi: contract.abi,
    eventName,
    logs: ownLogs,
  });

  assert.ok(
    parsedLogs.length > 0,
    `No events were emitted for contract with address "${contract.address}" and event name "${eventName}"`,
  );

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- logs generated from emitted events have the `args` field
  return parsedLogs as unknown as Array<{ args?: Record<string, any> }>;
}
