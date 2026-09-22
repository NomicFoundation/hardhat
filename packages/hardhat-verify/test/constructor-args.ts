import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { encodeConstructorArgs } from "../src/internal/constructor-args.js";

describe("constructor-args", () => {
  describe("encodeConstructorArgs", () => {
    const contract = "contracts/TheContract.sol:TheContract";

    it("should encode the arguments of the constructor declared in the abi", async () => {
      const abi = [
        { inputs: [], name: "inc", type: "function" },
        {
          inputs: [
            { name: "arg1", type: "uint256" },
            { name: "arg2", type: "bool" },
          ],
          type: "constructor",
        },
        { inputs: [], name: "Incremented", type: "event" },
      ];

      // The result is unprefixed, as it gets appended to the creation bytecode.
      assert.equal(
        await encodeConstructorArgs(abi, [50, true], contract),
        [
          // arg1: uint256 (50)
          "0000000000000000000000000000000000000000000000000000000000000032",
          // arg2: bool (true)
          "0000000000000000000000000000000000000000000000000000000000000001",
        ].join(""),
      );
    });

    it("should encode nothing when the contract takes no constructor arguments", async () => {
      assert.equal(
        await encodeConstructorArgs(
          [{ inputs: [], type: "constructor" }],
          [],
          contract,
        ),
        "",
      );

      // An ABI with no constructor means an implicit parameterless one.
      assert.equal(await encodeConstructorArgs([], [], contract), "");
    });

    it("should throw if the constructor arguments type is invalid", async () => {
      let abi = [
        {
          inputs: [
            {
              name: "arg1",
              type: "uint256",
            },
          ],
          type: "constructor",
        },
      ];
      let constructorArgs: unknown[] = ["not a number"];

      await assertRejectsWithHardhatError(
        encodeConstructorArgs(abi, constructorArgs, contract),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
          .INVALID_CONSTRUCTOR_ARGUMENT_TYPE,
        {
          value: String(constructorArgs[0]),
          reason: "invalid numeric value",
        },
      );

      abi = [
        {
          inputs: [
            {
              name: "arg1",
              type: "string",
            },
          ],
          type: "constructor",
        },
      ];
      constructorArgs = [1];

      await assertRejectsWithHardhatError(
        encodeConstructorArgs(abi, constructorArgs, contract),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
          .INVALID_CONSTRUCTOR_ARGUMENT_TYPE,
        {
          value: String(constructorArgs[0]),
          reason: "invalid string value",
        },
      );
    });

    it("should throw if the constructor arguments length is invalid", async () => {
      let abi = [
        {
          inputs: [{ name: "arg1", type: "uint256" }],
          type: "constructor",
        },
      ];
      let constructorArgs: unknown[] = [];

      await assertRejectsWithHardhatError(
        encodeConstructorArgs(abi, constructorArgs, contract),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
          .INVALID_CONSTRUCTOR_ARGUMENTS_LENGTH,
        {
          contract,
          requiredArgs: 1,
          providedArgs: 0,
        },
      );

      abi = [];
      constructorArgs = [1];

      await assertRejectsWithHardhatError(
        encodeConstructorArgs(abi, constructorArgs, contract),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
          .INVALID_CONSTRUCTOR_ARGUMENTS_LENGTH,
        {
          contract,
          requiredArgs: 0,
          providedArgs: 1,
        },
      );
    });

    it("should throw if a constructor argument overflows its type", async () => {
      const abi = [
        {
          inputs: [{ name: "arg1", type: "uint8" }],
          type: "constructor",
        },
      ];
      const constructorArgs = [256]; // 256 is out of bounds for uint8
      await assertRejectsWithHardhatError(
        encodeConstructorArgs(abi, constructorArgs, contract),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
          .CONSTRUCTOR_ARGUMENT_OVERFLOW,
        {
          value: String(constructorArgs[0]),
        },
      );
    });

    it("should throw if the constructor has a type that can't be encoded", async () => {
      const abi = [
        {
          inputs: [{ name: "arg1", type: "fixed128x18" }],
          type: "constructor",
        },
      ];

      await assertRejectsWithHardhatError(
        encodeConstructorArgs(abi, [1], contract),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
          .CONSTRUCTOR_ARGUMENTS_ENCODING_FAILED,
        {
          contract,
          reason:
            'The type "fixed128x18" of the parameter "arg1" is not supported.',
        },
      );
    });
  });
});
