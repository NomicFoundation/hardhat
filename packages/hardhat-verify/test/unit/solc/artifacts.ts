import type { CompilerOutputBytecode } from "hardhat/types";

import { assert } from "chai";

import {
  ByteOffset,
  getCallProtectionOffsets,
  getImmutableOffsets,
  getLibraryOffsets,
} from "../../../src/internal/solc/artifacts";

describe("artifacts", () => {
  describe("getLibraryOffsets", () => {
    it("should return a single offset for a single library", () => {
      const linkReferences: CompilerOutputBytecode["linkReferences"] = {
        "contracts/TestContract.sol": {
          Library1: [
            {
              length: 20,
              start: 146,
            },
          ],
        },
      };
      const expected: ByteOffset[] = [
        {
          length: 20,
          start: 146,
        },
      ];
      assert.deepEqual(getLibraryOffsets(linkReferences), expected);
    });

    it("should return all the offsets for the library", () => {
      const linkReferences: CompilerOutputBytecode["linkReferences"] = {
        "contracts/TestContract.sol": {
          Library1: [
            {
              length: 20,
              start: 146,
            },
            {
              length: 20,
              start: 347,
            },
          ],
        },
      };
      const expected: ByteOffset[] = [
        {
          length: 20,
          start: 146,
        },
        {
          length: 20,
          start: 347,
        },
      ];
      assert.deepEqual(getLibraryOffsets(linkReferences), expected);
    });

    it("should return the offsets for multiple libraries", () => {
      const linkReferences: CompilerOutputBytecode["linkReferences"] = {
        "contracts/TestContract.sol": {
          Library1: [
            {
              length: 20,
              start: 146,
            },
          ],
          Library2: [
            {
              length: 20,
              start: 489,
            },
            {
              length: 20,
              start: 645,
            },
          ],
        },
      };
      const expected: ByteOffset[] = [
        {
          length: 20,
          start: 146,
        },
        {
          length: 20,
          start: 489,
        },
        {
          length: 20,
          start: 645,
        },
      ];
      assert.deepEqual(getLibraryOffsets(linkReferences), expected);
    });

    it("should return an empty array if there's no libraries", () => {
      const linkReferences: CompilerOutputBytecode["linkReferences"] = {};
      const expected: ByteOffset[] = [];
      assert.deepEqual(getLibraryOffsets(linkReferences), expected);
    });
  });

  describe("getImmutableOffsets", () => {
    it("should return a single offset for a single immutable value", () => {
      const immutableReferences: CompilerOutputBytecode["immutableReferences"] =
        {
          "280": [{ length: 32, start: 2018 }],
        };
      const expected: ByteOffset[] = [{ length: 32, start: 2018 }];
      assert.deepEqual(getImmutableOffsets(immutableReferences), expected);
    });

    it("should return all the offsets for the immutable value", () => {
      const immutableReferences: CompilerOutputBytecode["immutableReferences"] =
        {
          "280": [
            { length: 32, start: 2018 },
            { length: 32, start: 2545 },
          ],
        };
      const expected: ByteOffset[] = [
        { length: 32, start: 2018 },
        { length: 32, start: 2545 },
      ];
      assert.deepEqual(getImmutableOffsets(immutableReferences), expected);
    });

    it("should return the offsets for multiple immutable values", () => {
      const immutableReferences: CompilerOutputBytecode["immutableReferences"] =
        {
          "280": [
            { length: 32, start: 2018 },
            { length: 32, start: 2545 },
          ],
          "282": [
            { length: 32, start: 1949 },
            { length: 32, start: 5399 },
          ],
          "285": [
            { length: 32, start: 3252 },
            { length: 32, start: 3582 },
          ],
        };
      const expected: ByteOffset[] = [
        { length: 32, start: 2018 },
        { length: 32, start: 2545 },
        { length: 32, start: 1949 },
        { length: 32, start: 5399 },
        { length: 32, start: 3252 },
        { length: 32, start: 3582 },
      ];
      assert.deepEqual(getImmutableOffsets(immutableReferences), expected);
    });

    it("should return an empty array if there's no immutable values", () => {
      const immutableReferences: CompilerOutputBytecode["immutableReferences"] =
        {};
      const expected: ByteOffset[] = [];
      assert.deepEqual(getImmutableOffsets(immutableReferences), expected);
    });
  });

  describe("getCallProtectionOffsets", () => {
    it("should return the offset if the library was called with the CALL opcode", () => {
      const bytecode = "73...";
      const referenceBytecode = "730000000000000000000000000000000000000000...";
      const expected: ByteOffset[] = [{ start: 1, length: 20 }];
      assert.deepEqual(
        getCallProtectionOffsets(bytecode, referenceBytecode),
        expected
      );
    });

    it("should return an empty array if the library was not called with the CALL opcode", () => {
      let bytecode = "60...";
      let referenceBytecode = "730000000000000000000000000000000000000000...";
      const expected: ByteOffset[] = [];
      assert.deepEqual(
        getCallProtectionOffsets(bytecode, referenceBytecode),
        expected,
        "Reference bytecode starts with valid placeholder but bytecode starts with a different opcode"
      );

      bytecode = "73...";
      referenceBytecode = "60806040526040518060400160405280600b8152...";
      assert.deepEqual(
        getCallProtectionOffsets(bytecode, referenceBytecode),
        expected,
        "Bytecode starts with valid opcode but reference bytecode does not start with the placeholder"
      );
    });
  });
});
