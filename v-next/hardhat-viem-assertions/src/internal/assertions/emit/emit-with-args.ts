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

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { deepEqual } from "@nomicfoundation/hardhat-utils/lang";

import { handleEmit } from "./core.js";

export async function emitWithArgs<
  ContractName extends keyof ContractAbis,
  EventName extends ContractEventName<ContractAbis[ContractName]>,
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
  contractFn: Promise<ReadContractReturnType | WriteContractReturnType>,
  contract: ContractReturnType<ContractName>,
  eventName: EventName,
  expectedArgs: any[],
): Promise<void> {
  const abiEvents: AbiEvent[] = contract.abi.filter(
    (item): item is AbiEvent =>
      item.type === "event" &&
      item.name === eventName &&
      item.inputs.length === expectedArgs.length,
  );

  assert.ok(
    abiEvents.length !== 0,
    `Event "${eventName}" with argument count ${expectedArgs.length} not found in the contract ABI`,
  );

  assert.ok(
    abiEvents.length === 1,
    `There are multiple events named "${eventName}" that accepts ${expectedArgs.length} input arguments. This scenario is currently not supported.`,
  );

  const expectedAbiEvent = abiEvents[0];

  const parsedLogs = await handleEmit(viem, contractFn, contract, eventName);

  for (const { args: logArgs } of parsedLogs) {
    let emittedArgs: unknown[] = [];

    if (logArgs === undefined) {
      if (expectedArgs.length === 0) {
        // If the logs contain no arguments and none are expected, we can return, this is a valid match
        return;
      }

      continue;
    }

    if (Array.isArray(logArgs)) {
      // All the expected args are listed in an array, this happens when some of the event parameters do not have parameter names.
      // Example: event EventX(uint u, uint) -> mapped to -> [bigint, bigint]
      emittedArgs = logArgs;
    } else {
      // The event parameters have names, so they are represented as an object.
      // They must be mapped into a sorted array that matches the order of the ABI event parameters.
      // Example: event EventY(uint u, uint v) -> mapped to -> { u: bigint, v: bigint }
      for (const [index, param] of expectedAbiEvent.inputs.entries()) {
        assertHardhatInvariant(
          param.name !== undefined,
          `The event parameter at index ${index} does not have a name`,
        );

        emittedArgs.push(logArgs[param.name]);
      }
    }

    if ((await deepEqual(emittedArgs, expectedArgs)) === true) {
      return;
    }

    if (parsedLogs.length === 1) {
      // Provide additional error details only if a single event was emitted
      assert.deepEqual(
        emittedArgs,
        expectedArgs,
        "The event arguments do not match the expected ones.",
      );
    }
  }

  assert.fail(
    "Multiple events were emitted, but none of them match the expected arguments.",
  );
}
