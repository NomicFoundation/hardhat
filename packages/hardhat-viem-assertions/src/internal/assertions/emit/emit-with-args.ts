import type { AbiHolder, EventArgsOf } from "../../../abi-types.js";
import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { ChainType } from "hardhat/types/network";
import type { Abi, AbiEvent, ContractEventName, Hash } from "viem";

import assert from "node:assert/strict";

import { isHex, keccak256, size, stringToHex } from "viem";

import { settle, stringifyArgs } from "../../helpers.js";
import { isArgumentMatch } from "../../predicates.js";

import { handleEmit } from "./core.js";

export async function emitWithArgs<
  TContract extends AbiHolder<Abi>,
  TEventName extends ContractEventName<TContract["abi"]>,
  ChainTypeT extends ChainType | string = "generic",
>(
  viem: HardhatViemHelpers<ChainTypeT>,
  txHash: Hash | Promise<Hash>,
  contract: TContract,
  eventName: TEventName,
  expectedArgs: EventArgsOf<TContract["abi"], TEventName>,
): Promise<void> {
  // Settle `txHash` first so the tx doesn't leak into the next test, but
  // defer rethrowing so ABI errors still take precedence over tx reverts.
  const txHashResult = await settle(txHash);

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

  if (txHashResult.ok === false) {
    // eslint-disable-next-line no-restricted-syntax -- propagate the original tx-revert error
    throw txHashResult.error;
  }

  const expectedAbiEvent = abiEvents[0];

  // txHash has already been awaited above; pass an already-resolved promise
  // so handleEmit's internal await is a no-op and we don't double-submit.
  const parsedLogs = await handleEmit(
    viem,
    Promise.resolve(txHashResult.value),
    contract,
    eventName,
  );

  const expectedTopics = getExpectedTopics(expectedAbiEvent, expectedArgs);

  for (const { args: logArgs } of parsedLogs) {
    let emittedArgs: any[] = [];

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
        assert.ok(
          param.name !== undefined,
          `The event parameter at index ${index} does not have a name`,
        );

        emittedArgs.push(logArgs[param.name]);
      }
    }

    const comparableExpectedArgs = resolveIndexedHashArgs(
      expectedArgs,
      expectedTopics,
      emittedArgs,
    );

    if (await isArgumentMatch(emittedArgs, comparableExpectedArgs)) {
      return;
    }

    if (parsedLogs.length === 1) {
      // Provide additional error details only if a single event was emitted

      if (expectedArgs.some((arg) => typeof arg === "function")) {
        // If there are predicate matchers, we can't use the built-in deepEqual with diff
        const displayExpectedArgs = comparableExpectedArgs.map(
          (expectedArg) => {
            if (typeof expectedArg === "function") {
              const hasName =
                expectedArg.name !== undefined && expectedArg.name !== "";
              return `<${hasName ? expectedArg.name : "predicate"}>`;
            } else {
              return expectedArg;
            }
          },
        );

        assert.fail(
          `The event arguments do not match the expected ones:\nExpected: ${stringifyArgs(displayExpectedArgs)}\nEmitted: ${stringifyArgs(emittedArgs)}`,
        );
      } else {
        // Otherwise, we can use it
        assert.deepEqual(
          emittedArgs,
          comparableExpectedArgs,
          "The event arguments do not match the expected ones.",
        );
      }
    }
  }

  assert.fail(
    "Multiple events were emitted, but none of them match the expected arguments.",
  );
}

// Indexed `string` and `bytes` event arguments are logged only as the keccak256
// hash of their value. For each of them, this returns the topics the expected
// arg can match: the hash of the value and, if the value already looks like a
// hash, the value itself. The last topic is the one shown when nothing matches.
function getExpectedTopics(
  abiEvent: AbiEvent,
  expectedArgs: readonly unknown[],
): Array<string[] | undefined> {
  return expectedArgs.map((arg, index) => {
    const { type, indexed } = abiEvent.inputs[index];

    if (indexed !== true || typeof arg !== "string") {
      return undefined;
    }

    let valueHash: string;
    if (type === "string") {
      valueHash = keccak256(stringToHex(arg));
    } else if (type === "bytes" && isHex(arg)) {
      valueHash = keccak256(arg);
    } else {
      return undefined;
    }

    return isHex(arg) && size(arg) === 32
      ? [valueHash, arg.toLowerCase()]
      : [valueHash];
  });
}

// Replaces each indexed `string` and `bytes` expected arg with the emitted
// topic it matches, or with its last expected topic if none does.
function resolveIndexedHashArgs(
  expectedArgs: readonly unknown[],
  expectedTopics: Array<string[] | undefined>,
  emittedArgs: readonly unknown[],
): unknown[] {
  return expectedArgs.map((arg, index) => {
    const topics = expectedTopics[index];

    if (topics === undefined) {
      return arg;
    }

    return (
      topics.find((topic) => topic === emittedArgs[index]) ?? topics.at(-1)
    );
  });
}
