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
  const parsedLogs = await handleEmit(viem, contractFn, contract, eventName);

  assert.ok(
    "args" in parsedLogs[0],
    `No args in the event logs, are you sure you are targeting an event with args?`,
  );

  const abiEvents = contract.abi.filter(
    (item) => item.type === "event" && item.name === eventName,
  );

  assert.notEqual(
    abiEvents.length,
    0,
    `Event "${eventName}" not found in the contract ABI`,
  );

  assert.equal(
    abiEvents.length,
    1,
    `There should be only one event named "${eventName}" in the contract ABI`,
  );

  const abiEvent = abiEvents[0];

  assertHardhatInvariant(
    "inputs" in abiEvent,
    `No args in the event abi, are you sure you are targeting an event with args?`,
  );

  const emittedArgs: any[] = [];

  if (args.length > 0) {
    assertHardhatInvariant(
      parsedLogs[0].args !== undefined,
      `There should be args in the event logs`,
    );

    for (const [index, param] of abiEvent.inputs.entries()) {
      assertHardhatInvariant(
        param.name !== undefined,
        `The event parameter at index ${index} does not have a name`,
      );

      emittedArgs.push(parsedLogs[0].args[param.name]);
    }
  }

  assert.deepEqual(
    emittedArgs,
    args,
    "The event arguments do not match the expected ones.",
  );
}
