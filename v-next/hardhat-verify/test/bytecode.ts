import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { CompilerOutputBytecode } from "hardhat/types/solidity";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { useEphemeralFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { getUnprefixedHexString } from "@nomicfoundation/hardhat-utils/hex";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import {
  nullifyBytecodeOffsets,
  getLibraryOffsets,
  getImmutableOffsets,
  getCallProtectionOffsets,
} from "../src/internal/bytecode.js";

describe("bytecode", () => {
  describe("nullifyBytecodeOffsets", () => {
    useEphemeralFixtureProject("default");

    let hre: HardhatRuntimeEnvironment;
    before(async () => {
      const hardhatUserConfig =
        // eslint-disable-next-line import/no-relative-packages -- allowed in test
        (await import("./fixture-projects/default/hardhat.config.js")).default;
      hre = await createHardhatRuntimeEnvironment(hardhatUserConfig);
      await hre.tasks.getTask("compile").run();
    });

    it("should nullify offsets in bytecode", async () => {
      const {
        bytecode,
        deployedBytecode,
        linkReferences,
        immutableReferences = {},
      } = await hre.artifacts.readArtifact("WithOffsets");
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- we only use the below properties */
      const compilerOutputBytecode = {
        object: deployedBytecode,
        linkReferences,
        immutableReferences,
      } as unknown as CompilerOutputBytecode;

      assert.match(bytecode, /__\$[0-9a-fA-F]{34}\$__/);
      assert(
        Object.keys(linkReferences).length > 0,
        "Link references should not be empty",
      );
      assert(
        Object.keys(immutableReferences ?? {}).length > 0,
        "Immutable references should not be empty",
      );
      assert.doesNotMatch(
        nullifyBytecodeOffsets(
          getUnprefixedHexString(bytecode),
          compilerOutputBytecode,
        ),
        /__\$[0-9a-fA-F]{34}\$__/,
      );
    });

    it("should not modify bytecode without offsets", async () => {
      const {
        bytecode,
        deployedBytecode,
        linkReferences,
        immutableReferences = {},
      } = await hre.artifacts.readArtifact("Counter");
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- we only use the below properties */
      const compilerOutputBytecode = {
        object: deployedBytecode,
        linkReferences,
        immutableReferences,
      } as unknown as CompilerOutputBytecode;

      assert.doesNotMatch(bytecode, /__\$[0-9a-fA-F]{34}\$__/);
      assert.equal(Object.keys(linkReferences).length, 0);
      assert.equal(Object.keys(immutableReferences ?? {}).length, 0);
      assert.equal(
        nullifyBytecodeOffsets(
          getUnprefixedHexString(bytecode),
          compilerOutputBytecode,
        ),
        getUnprefixedHexString(bytecode),
      );
    });
  });

  describe("getLibraryOffsets", () => {
    it("should return an array with one offset when there is one library reference", () => {
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
      const expected = [
        {
          length: 20,
          start: 146,
        },
      ];

      assert.deepEqual(getLibraryOffsets(linkReferences), expected);
    });

    it("should return all offsets for a single library with multiple references", () => {
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
      const expected = [
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

    it("should return all offsets when there are multiple libraries", () => {
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
      const expected = [
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

    it("should return all offsets for libraries defined in different source files", () => {
      const linkReferences: CompilerOutputBytecode["linkReferences"] = {
        "contracts/TestContract.sol": {
          Library1: [
            {
              length: 20,
              start: 146,
            },
          ],
        },
        "contracts/AnotherContract.sol": {
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
      const expected = [
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

    it("should return an empty array if there are no libraries", () => {
      assert.deepEqual(getLibraryOffsets({}), []);
    });
  });

  describe("getImmutableOffsets", () => {
    it("should return an array with one offset for a single immutable reference", () => {
      const immutableReferences: CompilerOutputBytecode["immutableReferences"] =
        {
          "280": [{ length: 32, start: 2018 }],
        };
      const expected = [{ length: 32, start: 2018 }];

      assert.deepEqual(getImmutableOffsets(immutableReferences), expected);
    });

    it("should return all offsets for a single immutable slot with multiple references", () => {
      const immutableReferences: CompilerOutputBytecode["immutableReferences"] =
        {
          "280": [
            { length: 32, start: 2018 },
            { length: 32, start: 2545 },
          ],
        };
      const expected = [
        { length: 32, start: 2018 },
        { length: 32, start: 2545 },
      ];

      assert.deepEqual(getImmutableOffsets(immutableReferences), expected);
    });

    it("should return all offsets for multiple immutable slots", () => {
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
      const expected = [
        { length: 32, start: 2018 },
        { length: 32, start: 2545 },
        { length: 32, start: 1949 },
        { length: 32, start: 5399 },
        { length: 32, start: 3252 },
        { length: 32, start: 3582 },
      ];

      assert.deepEqual(getImmutableOffsets(immutableReferences), expected);
    });

    it("should return an empty array if there are no immutable references", () => {
      assert.deepEqual(getImmutableOffsets({}), []);
    });
  });

  describe("getCallProtectionOffsets", () => {
    it("should return the offset if the library was called with the CALL opcode", () => {
      const bytecode = "73...";
      const referenceBytecode = "730000000000000000000000000000000000000000...";
      const expected = [{ start: 1, length: 20 }];

      assert.deepEqual(
        getCallProtectionOffsets(bytecode, referenceBytecode),
        expected,
      );
    });

    it("should return an empty array if the library was not called with the CALL opcode", () => {
      let bytecode = "60...";
      let referenceBytecode = "730000000000000000000000000000000000000000...";

      assert.deepEqual(
        getCallProtectionOffsets(bytecode, referenceBytecode),
        [],
        "Reference bytecode starts with valid placeholder but bytecode starts with a different opcode",
      );

      bytecode = "73...";
      referenceBytecode = "60806040526040518060400160405280600b8152...";
      assert.deepEqual(
        getCallProtectionOffsets(bytecode, referenceBytecode),
        [],
        "Bytecode starts with valid opcode but reference bytecode does not start with the placeholder",
      );
    });
  });
});
