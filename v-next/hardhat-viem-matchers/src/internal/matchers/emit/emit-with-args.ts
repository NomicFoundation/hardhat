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
  args: any[],
): Promise<void> {
  const abiEvents: AbiEvent[] = contract.abi.filter(
    (item): item is AbiEvent =>
      item.type === "event" &&
      item.name === eventName &&
      item.inputs.length === args.length,
  );

  assert.ok(
    abiEvents.length !== 0,
    `Event "${eventName}" with argument count ${args.length} not found in the contract ABI`,
  );

  assert.ok(
    abiEvents.length === 1,
    `There are multiple events named "${eventName}" that accepts ${args.length} input arguments. This scenario is currently not supported.`,
  );

  const parsedLogs = await handleEmit(viem, contractFn, contract, eventName);

  const emittedArgs: any[] = [];
  if (args.length > 0) {
    const parsedLog = parsedLogs[0].args;
    assert.ok(
      parsedLog !== undefined,
      `No arguments in the event logs, are you sure you are targeting an event with arguments?`,
    );

    const abiEvent = abiEvents[0];

    let parsedLogCount = 0;
    for (const [index, param] of abiEvent.inputs.entries()) {
      assertHardhatInvariant(
        param.name !== undefined,
        `The event parameter at index ${index} does not have a name`,
      );

      emittedArgs.push(parsedLog[param.name]);

      parsedLogCount++;
    }

    if (parsedLogCount !== Object.keys(parsedLog).length) {
      assert.fail(
        `The provided event "${eventName}" expects ${args.length} arguments, but the emitted event contains ${Object.keys(parsedLog).length}.`,
      );
    }
  }

  assert.deepEqual(
    emittedArgs,
    args,
    "The event arguments do not match the expected ones.",
  );
}
