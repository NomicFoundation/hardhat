import type { HardhatViemAssertions } from "../../src/types.js";
import type { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";
import type { ReadContractReturnType, WriteContractReturnType } from "viem";

import { describe, it } from "node:test";

// Type-only checks. Bodies never run; `tsc --build` validates them.
//
// We use IIFEs rather than `expectTypeOf(...).toBeCallableWith(...)` because
// these helpers are generic, and `toBeCallableWith` doesn't support it (see
// https://github.com/mmkal/expect-type#limitations).
//
// The contract type is built from a `const` ABI tuple because this fixture
// has no typegen; end users get the same shape via codegen, `parseAbi`, or
// an imported ABI constant.

const _abi = [
  {
    type: "event",
    name: "WithTwoUintArgs",
    inputs: [
      { name: "u", type: "uint256", indexed: false },
      { name: "v", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "WithoutArgs",
    inputs: [],
    anonymous: false,
  },
  {
    type: "error",
    name: "CustomError",
    inputs: [],
  },
  {
    type: "error",
    name: "CustomErrorWithUintAndString",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "string" },
    ],
  },
  {
    type: "function",
    name: "noop",
    stateMutability: "view",
    inputs: [],
    outputs: [],
  },
] as const;

declare const assertions: HardhatViemAssertions;
declare const contract: GetContractReturnType<typeof _abi>;
declare const fn: Promise<ReadContractReturnType | WriteContractReturnType>;

describe("assertion typings", () => {
  it("emit accepts only event names declared on the contract ABI", () => {
    void (() => assertions.emit(fn, contract, "WithoutArgs"));

    void (() =>
      assertions.emit(
        fn,
        contract,
        // @ts-expect-error -- "ForeignEvent" is not in the ABI
        "ForeignEvent",
      ));
  });

  it("emitWithArgs narrows expectedArgs to the event's input tuple", () => {
    void (() =>
      assertions.emitWithArgs(fn, contract, "WithTwoUintArgs", [
        1n,
        (v: bigint) => v > 0n,
      ]));

    void (() =>
      assertions.emitWithArgs(
        fn,
        contract,
        "WithTwoUintArgs",
        // @ts-expect-error -- second arg is a string, not a bigint or predicate
        [1n, "two"],
      ));

    void (() =>
      assertions.emitWithArgs(
        fn,
        contract,
        "WithTwoUintArgs",
        // @ts-expect-error -- only one arg, ABI declares two
        [1n],
      ));

    void (() =>
      assertions.emitWithArgs(fn, contract, "WithTwoUintArgs", [
        1n,
        // @ts-expect-error -- predicate types its arg as string, ABI says bigint
        (v: string) => v.length > 0,
      ]));
  });

  it("revertWithCustomError accepts only error names declared on the ABI", () => {
    void (() => assertions.revertWithCustomError(fn, contract, "CustomError"));

    // Foreign errors (e.g. `ERC20InsufficientBalance` from a called token)
    // must be bundled into the contract's ABI to be assertable, since the
    // runtime decodes revert data via `decodeErrorResult` against the ABI.
    void (() =>
      assertions.revertWithCustomError(
        fn,
        contract,
        // @ts-expect-error -- "ERC20InsufficientBalance" is not in the ABI
        "ERC20InsufficientBalance",
      ));
  });

  it("revertWithCustomErrorWithArgs narrows expectedArgs to the error's input tuple", () => {
    void (() =>
      assertions.revertWithCustomErrorWithArgs(
        fn,
        contract,
        "CustomErrorWithUintAndString",
        [1n, (v: string) => v.length > 0],
      ));

    void (() =>
      assertions.revertWithCustomErrorWithArgs(
        fn,
        contract,
        "CustomErrorWithUintAndString",
        // @ts-expect-error -- second arg is a bigint, not a string
        [1n, 2n],
      ));

    void (() =>
      assertions.revertWithCustomErrorWithArgs(
        fn,
        contract,
        "CustomErrorWithUintAndString",
        // @ts-expect-error -- only one arg, error declares two
        [1n],
      ));

    void (() =>
      assertions.revertWithCustomErrorWithArgs(
        fn,
        contract,
        "CustomErrorWithUintAndString",
        [
          // @ts-expect-error -- predicate types its arg as string, ABI says uint256
          (v: string) => v.length > 0,
          "test",
        ],
      ));
  });
});
