import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { encodeConstructorArgs } from "../src/internal/constructor-args.js";

describe("constructor-args", () => {
  describe("encodeConstructorArgs", () => {
    const contract = "contracts/TheContract.sol:TheContract";

    it("should encode constructor arguments with static types", async () => {
      const abi = [
        {
          inputs: [{ name: "arg1", type: "uint256" }],
          type: "constructor",
        },
      ];
      const constructorArgs = [50];

      const encodedConstructorArgs = await encodeConstructorArgs(
        abi,
        constructorArgs,
        contract,
      );

      const expectedEncodedConstructorArgs = [
        // uint256 (50)
        "0000000000000000000000000000000000000000000000000000000000000032",
      ].join("");
      assert.equal(encodedConstructorArgs, expectedEncodedConstructorArgs);
    });

    it("should encode constructor arguments with dynamic types", async () => {
      const abi = [
        {
          inputs: [{ name: "arg1", type: "string" }],
          type: "constructor",
        },
      ];
      const constructorArgs = ["initializer"];

      const encodedConstructorArgs = await encodeConstructorArgs(
        abi,
        constructorArgs,
        contract,
      );

      const expectedEncodedConstructorArgs = [
        // string offset (32 bytes): after the first slot
        "0000000000000000000000000000000000000000000000000000000000000020",
        // string length (11)
        "000000000000000000000000000000000000000000000000000000000000000b",
        // string ("initializer")
        "696e697469616c697a6572000000000000000000000000000000000000000000",
      ].join("");
      assert.equal(encodedConstructorArgs, expectedEncodedConstructorArgs);
    });

    it("should encode constructor arguments with mixed static and dynamic types", async () => {
      const abi = [
        {
          inputs: [
            { name: "arg1", type: "uint256" },
            { name: "arg2", type: "string" },
            { name: "arg3", type: "address" },
          ],
          type: "constructor",
        },
      ];
      const constructorArgs = [
        50,
        "initializer",
        "0x752C8191E6b1Db38B41A8c8921F7a703F2969d18",
      ];

      const encodedConstructorArgs = await encodeConstructorArgs(
        abi,
        constructorArgs,
        contract,
      );

      const expectedEncodedConstructorArgs = [
        // uint256 (50)
        "0000000000000000000000000000000000000000000000000000000000000032",
        // string offset (96 bytes): after the third slot
        "0000000000000000000000000000000000000000000000000000000000000060",
        // address (0x752c8191e6b1db38b41a8c8921f7a703f2969d18)
        "000000000000000000000000752c8191e6b1db38b41a8c8921f7a703f2969d18",
        // string length (11)
        "000000000000000000000000000000000000000000000000000000000000000b",
        // string ("initializer")
        "696e697469616c697a6572000000000000000000000000000000000000000000",
      ].join("");
      assert.equal(encodedConstructorArgs, expectedEncodedConstructorArgs);
    });

    it("should encode constructor arguments with nested tuples", async () => {
      const abi = [
        {
          inputs: [
            {
              name: "arg1",
              type: "tuple",
              components: [
                {
                  name: "x",
                  type: "uint256",
                },
                {
                  name: "y",
                  type: "uint256",
                },
                {
                  name: "nestedProperty",
                  type: "tuple",
                  components: [
                    {
                      name: "x",
                      type: "uint256",
                    },
                    {
                      name: "y",
                      type: "uint256",
                    },
                  ],
                },
              ],
            },
          ],
          type: "constructor",
        },
      ];
      const constructorArgs = [
        {
          x: 8,
          y: 16,
          nestedProperty: {
            x: 32,
            y: 64,
          },
        },
      ];

      const encodedConstructorArgs = await encodeConstructorArgs(
        abi,
        constructorArgs,
        contract,
      );

      const expectedArguments = [
        // tuple x (8)
        "0000000000000000000000000000000000000000000000000000000000000008",
        // tuple y (16)
        "0000000000000000000000000000000000000000000000000000000000000010",
        // nested tuple x (32)
        "0000000000000000000000000000000000000000000000000000000000000020",
        // nested tuple y (64)
        "0000000000000000000000000000000000000000000000000000000000000040",
      ].join("");
      assert.equal(encodedConstructorArgs, expectedArguments);
    });

    it("should encode constructor arguments with arrays", async () => {
      const abi = [
        {
          inputs: [{ name: "arg1", type: "uint256[]" }],
          type: "constructor",
        },
      ];
      const constructorArgs = [[1, 2, 3]];

      const encodedConstructorArgs = await encodeConstructorArgs(
        abi,
        constructorArgs,
        contract,
      );

      const expectedEncodedConstructorArgs = [
        // array offset (32 bytes): after the first slot
        "0000000000000000000000000000000000000000000000000000000000000020",
        // array length (3)
        "0000000000000000000000000000000000000000000000000000000000000003",
        // first element (1)
        "0000000000000000000000000000000000000000000000000000000000000001",
        // second element (2)
        "0000000000000000000000000000000000000000000000000000000000000002",
        // third element (3)
        "0000000000000000000000000000000000000000000000000000000000000003",
      ].join("");
      assert.equal(encodedConstructorArgs, expectedEncodedConstructorArgs);
    });

    it("should encode an empty string", async () => {
      const abi = [
        { inputs: [{ name: "arg1", type: "string" }], type: "constructor" },
      ];
      const constructorArgs = [""];

      const encodedConstructorArgs = await encodeConstructorArgs(
        abi,
        constructorArgs,
        contract,
      );

      const expectedEncodedConstructorArgs = [
        // string offset (32 bytes): after the first slot
        "0000000000000000000000000000000000000000000000000000000000000020",
        // string length (0)
        "0000000000000000000000000000000000000000000000000000000000000000",
      ].join("");
      assert.equal(encodedConstructorArgs, expectedEncodedConstructorArgs);
    });

    it("should encode an empty array", async () => {
      const abi = [
        { inputs: [{ name: "arg1", type: "uint256[]" }], type: "constructor" },
      ];
      const constructorArgs = [[]];

      const encodedConstructorArgs = await encodeConstructorArgs(
        abi,
        constructorArgs,
        contract,
      );

      const expectedEncodedConstructorArgs = [
        // array offset (32 bytes): after the first slot
        "0000000000000000000000000000000000000000000000000000000000000020",
        // array length (0)
        "0000000000000000000000000000000000000000000000000000000000000000",
      ].join("");
      assert.equal(encodedConstructorArgs, expectedEncodedConstructorArgs);
    });

    it("should encode an empty constructor", async () => {
      const abi = [
        {
          inputs: [],
          type: "constructor",
        },
      ];
      const constructorArgs: unknown[] = [];

      const encodedConstructorArgs = await encodeConstructorArgs(
        abi,
        constructorArgs,
        contract,
      );

      assert.equal(encodedConstructorArgs, "");
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
          reason: "invalid BigNumber string",
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
  });
});
