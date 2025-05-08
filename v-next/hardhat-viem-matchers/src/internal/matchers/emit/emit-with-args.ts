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
import { inspect } from "node:util";

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
  args: any[],
): Promise<void> {
  const parsedLogs = await handleEmit(viem, contractFn, contract, eventName);

  assert.equal(
    "args" in parsedLogs[0],
    true,
    `No args in the event logs, are you sure you are targeting an event with args?`,
  );

  const abiEvents = contract.abi.filter(
    (abi) => "name" in abi && abi.name === eventName,
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

  // Map the expected arguments using the same structure as used in the viem logs.
  // Retrieve the parameter names from the ABI and assign each its expected value.
  const argsToCheck: Record<string, any> = {};
  for (const [index, param] of abiEvent.inputs.entries()) {
    assertHardhatInvariant(
      param.name !== undefined,
      `The event parameter at index ${index} does not have a name`,
    );

    argsToCheck[param.name] = args[index];
  }

  const areEqual = await deepEqual(parsedLogs[0].args, argsToCheck);
  assert.equal(
    areEqual,
    true,
    `The event arguments do not match the expected ones.
Expected: ${inspect(argsToCheck, { depth: null, colors: false })}
Got: ${inspect(parsedLogs[0].args, { depth: null, colors: false })}`,
  );
}
