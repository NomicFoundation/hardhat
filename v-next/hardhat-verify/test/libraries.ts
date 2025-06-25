import type { ContractInformation } from "../src/internal/contract.js";
import type { SourceLibraries } from "../src/internal/libraries.js";
import type { CompilerOutputBytecode } from "hardhat/types/solidity";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { getPrefixedHexString } from "@nomicfoundation/hardhat-utils/hex";

import {
  resolveLibraryInformation,
  getLibraryFqns,
  resolveUserLibraries,
  lookupLibrary,
  getDetectableLibrariesFromBytecode,
  mergeLibraries,
} from "../src/internal/libraries.js";

describe("libraries", () => {
  describe("resolveLibraryInformation", () => {
    const contractName = "C.sol:ContractC";

    it("should return empty libraries when no libraries are used", () => {
      const deployedBytecode = "deadbeef";
      const linkReferences: CompilerOutputBytecode["linkReferences"] = {};
      const deployedLinkReferences: CompilerOutputBytecode["linkReferences"] =
        {};

      const contractInformation = buildContractInformation(
        contractName,
        deployedBytecode,
        linkReferences,
        deployedLinkReferences,
      );

      const libraryInformation = resolveLibraryInformation(
        contractInformation,
        {},
      );

      assert.deepEqual(libraryInformation, {
        libraries: {},
        undetectableLibraries: [],
      });
    });

    it("should throw an error when user fails to supply undetectable libraries", () => {
      const linkReferences: CompilerOutputBytecode["linkReferences"] = {
        "C.sol": { LibC: [{ start: 0, length: 20 }] },
      };
      const deployedLinkReferences: CompilerOutputBytecode["linkReferences"] =
        {};
      const libraryAddress = "abcdef1234567890abcdef1234567890abcdef12";
      const deployedBytecode = libraryAddress + "deadbeef";

      const contractInformation = buildContractInformation(
        contractName,
        deployedBytecode,
        linkReferences,
        deployedLinkReferences,
      );

      assertThrowsHardhatError(
        () => resolveLibraryInformation(contractInformation, {}),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.MISSING_LIBRARY_ADDRESSES,
        {
          contract: contractName,
          missingList: "  * C.sol:LibC",
        },
      );
    });

    it("should resolve detectable libraries automatically and undetectable libraries from user libraries", () => {
      const linkReferences: CompilerOutputBytecode["linkReferences"] = {
        "C.sol": { LibC: [{ start: 0, length: 20 }] },
        "A.sol": { LibA: [{ start: 20, length: 20 }] },
      };
      const deployedLinkReferences: CompilerOutputBytecode["linkReferences"] = {
        "A.sol": { LibA: [{ start: 20, length: 20 }] },
      };
      const libCAddress = "abcdef1234567890abcdef1234567890abcdef12";
      const libAAddress = "1234567890abcdef1234567890abcdef12345678";
      const deployedBytecode = libCAddress + libAAddress + "deadbeef";

      const contractInformation = buildContractInformation(
        contractName,
        deployedBytecode,
        linkReferences,
        deployedLinkReferences,
      );

      const libraryInformation = resolveLibraryInformation(
        contractInformation,
        {
          LibC: getPrefixedHexString(libCAddress),
        },
      );

      assert.deepEqual(libraryInformation, {
        libraries: {
          "C.sol": { LibC: getPrefixedHexString(libCAddress) },
          "A.sol": { LibA: getPrefixedHexString(libAAddress) },
        },
        undetectableLibraries: ["C.sol:LibC"],
      });
    });
  });

  describe("getLibraryFqns", () => {
    it("should return an empty array when no libraries are provided", () => {
      const libraries: Record<string, Record<string, unknown>> = {};

      assert.deepEqual(getLibraryFqns(libraries), []);
    });

    it("should return a single fqn for one source with one library", () => {
      const libraries = {
        "contracts/Lib.sol": { MyLib: {} },
      };

      assert.deepEqual(getLibraryFqns(libraries), ["contracts/Lib.sol:MyLib"]);
    });

    it("should return multiple fqns for one source with multiple libraries", () => {
      const libraries = {
        "contracts/Lib.sol": { LibA: {}, LibB: {} },
      };

      assert.deepEqual(getLibraryFqns(libraries), [
        "contracts/Lib.sol:LibA",
        "contracts/Lib.sol:LibB",
      ]);
    });

    it("should return fqns for multiple sources with multiple libraries", () => {
      const libraries = {
        "contracts/libs/A.sol": { A1: {}, A2: {} },
        "contracts/libs/B.sol": { B1: {}, B2: {}, B3: {} },
      };

      assert.deepEqual(getLibraryFqns(libraries), [
        "contracts/libs/A.sol:A1",
        "contracts/libs/A.sol:A2",
        "contracts/libs/B.sol:B1",
        "contracts/libs/B.sol:B2",
        "contracts/libs/B.sol:B3",
      ]);
    });

    it("should ignore inherited properties on source library objects", () => {
      const proto = { ProtoLib: {} };
      const sourceLibs = Object.create(proto);
      sourceLibs.RealLib = {};
      const libraries = { "contracts/X.sol": sourceLibs };

      assert.deepEqual(getLibraryFqns(libraries), ["contracts/X.sol:RealLib"]);
    });
  });

  describe("resolveUserLibraries", () => {
    const contractName = "MyContract";
    const allLibraryFqns = ["A.sol:LibA", "B.sol:LibB"];
    const detectableLibraryFqns = ["A.sol:LibA"];
    const undetectableLibraryFqns = ["B.sol:LibB"];

    it("should throw an error if any of the user libraries are not valid addresses", () => {
      const userLibraryAddresses = {
        LibA: "0xabcdef1234567890abcdef1234567890abcdef12",
        LibB: "not-an-address",
      };

      assertThrowsHardhatError(
        () =>
          resolveUserLibraries(
            allLibraryFqns,
            detectableLibraryFqns,
            undetectableLibraryFqns,
            userLibraryAddresses,
            contractName,
          ),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.INVALID_LIBRARY_ADDRESS,
        {
          contract: contractName,
          library: "LibB",
          address: "not-an-address",
        },
      );
    });

    it("should resolve a single user library by name", () => {
      const userLibraryAddresses = {
        LibA: "0xabcdef1234567890abcdef1234567890abcdef12",
      };

      const userLibraries = resolveUserLibraries(
        allLibraryFqns,
        detectableLibraryFqns,
        undetectableLibraryFqns,
        userLibraryAddresses,
        contractName,
      );

      assert.deepEqual(userLibraries, {
        "A.sol": { LibA: userLibraryAddresses.LibA },
      });
    });

    it("should resolve multiple user libraries", () => {
      const userLibraryAddresses = {
        LibA: "0xabcdef1234567890abcdef1234567890abcdef12",
        LibB: "0x1234567890abcdef1234567890abcdef12345678",
      };

      const result = resolveUserLibraries(
        allLibraryFqns,
        detectableLibraryFqns,
        undetectableLibraryFqns,
        userLibraryAddresses,
        contractName,
      );

      assert.deepEqual(result, {
        "A.sol": {
          LibA: userLibraryAddresses.LibA,
        },
        "B.sol": {
          LibB: userLibraryAddresses.LibB,
        },
      });
    });

    it("should throw an error if a library is mapped twice", () => {
      const userLibraryAddresses = {
        LibA: "0xabcdef1234567890abcdef1234567890abcdef12",
        "A.sol:LibA": "0xabcdef1234567890abcdef1234567890abcdef12",
      };

      assertThrowsHardhatError(
        () =>
          resolveUserLibraries(
            allLibraryFqns,
            detectableLibraryFqns,
            undetectableLibraryFqns,
            userLibraryAddresses,
            contractName,
          ),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.DUPLICATED_LIBRARY,
        {
          library: "LibA",
          libraryFqn: "A.sol:LibA",
        },
      );
    });
  });

  describe("lookupLibrary", () => {
    const contractName = "MyContract";

    it("should return the fqn when matching by library fqn", () => {
      const allLibraryFqns = ["A.sol:Lib1"];
      const detectableLibraryFqns: string[] = [];
      const undetectableLibraryFqns = ["A.sol:Lib1"];
      const libraryName = "A.sol:Lib1";

      const foundLibraryFqn = lookupLibrary(
        allLibraryFqns,
        detectableLibraryFqns,
        undetectableLibraryFqns,
        libraryName,
        contractName,
      );

      assert.equal(foundLibraryFqn, "A.sol:Lib1");
    });

    it("should return the fqn when matching by library name", () => {
      const allLibraryFqns = ["A.sol:Lib1"];
      const detectableLibraryFqns: string[] = [];
      const undetectableLibraryFqns = ["A.sol:Lib1"];
      const libraryName = "Lib1";

      const foundLibraryFqn = lookupLibrary(
        allLibraryFqns,
        detectableLibraryFqns,
        undetectableLibraryFqns,
        libraryName,
        contractName,
      );

      assert.equal(foundLibraryFqn, "A.sol:Lib1");
    });

    it("should throw an error when the contract does not use any libraries", () => {
      const allLibraryFqns: string[] = [];
      const detectableLibraryFqns: string[] = [];
      const undetectableLibraryFqns: string[] = [];
      const libraryName = "MissingLib";

      assertThrowsHardhatError(
        () =>
          lookupLibrary(
            allLibraryFqns,
            detectableLibraryFqns,
            undetectableLibraryFqns,
            libraryName,
            contractName,
          ),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.UNUSED_LIBRARY,
        {
          contract: contractName,
          library: "MissingLib",
          suggestion: "This contract doesn't use any external libraries.",
        },
      );
    });

    it("should throw an error when the contract uses libraries (detectable and undetectable) but the specified library is not found", () => {
      const allLibraryFqns = ["A.sol:Lib1", "B.sol:Lib2"];
      const detectableLibraryFqns = ["B.sol:Lib2"];
      const undetectableLibraryFqns = ["A.sol:Lib1"];
      const libraryName = "MissingLib";

      assertThrowsHardhatError(
        () =>
          lookupLibrary(
            allLibraryFqns,
            detectableLibraryFqns,
            undetectableLibraryFqns,
            libraryName,
            contractName,
          ),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.UNUSED_LIBRARY,
        {
          contract: contractName,
          library: "MissingLib",
          suggestion: [
            "This contract uses the following external libraries:",
            "  * A.sol:Lib1",
            "  * B.sol:Lib2 (optional)",
            "Libraries marked as optional don't need to be specified since their addresses are autodetected by the plugin.",
          ].join("\n"),
        },
      );
    });

    it("should throw an error when the contract uses libraries (detectable) but the specified library is not found", () => {
      const allLibraryFqns = ["A.sol:Lib1", "B.sol:Lib2"];
      const detectableLibraryFqns = ["B.sol:Lib2", "A.sol:Lib1"];
      const undetectableLibraryFqns: string[] = [];
      const libraryName = "MissingLib";

      assertThrowsHardhatError(
        () =>
          lookupLibrary(
            allLibraryFqns,
            detectableLibraryFqns,
            undetectableLibraryFqns,
            libraryName,
            contractName,
          ),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.UNUSED_LIBRARY,
        {
          contract: contractName,
          library: "MissingLib",
          suggestion: [
            "This contract uses the following external libraries:",
            "  * B.sol:Lib2 (optional)",
            "  * A.sol:Lib1 (optional)",
            "Libraries marked as optional don't need to be specified since their addresses are autodetected by the plugin.",
          ].join("\n"),
        },
      );
    });

    it("should throw an error when the contract uses libraries (undetectable) but the specified library is not found", () => {
      const allLibraryFqns = ["A.sol:Lib1", "B.sol:Lib2"];
      const detectableLibraryFqns: string[] = [];
      const undetectableLibraryFqns = ["A.sol:Lib1", "B.sol:Lib2"];
      const libraryName = "MissingLib";

      assertThrowsHardhatError(
        () =>
          lookupLibrary(
            allLibraryFqns,
            detectableLibraryFqns,
            undetectableLibraryFqns,
            libraryName,
            contractName,
          ),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.UNUSED_LIBRARY,
        {
          contract: contractName,
          library: "MissingLib",
          suggestion: [
            "This contract uses the following external libraries:",
            "  * A.sol:Lib1",
            "  * B.sol:Lib2",
          ].join("\n"),
        },
      );
    });

    it("should throw an error when multiple libraries match the specified library name", () => {
      const allLibraryFqns = ["A.sol:LibX", "B.sol:LibX", "C.sol:Other"];
      const detectableLibraryFqns: string[] = [];
      const undetectableLibraryFqns = ["B.sol:Lib2", "A.sol:Lib1"];
      const libraryName = "LibX";

      assertThrowsHardhatError(
        () =>
          lookupLibrary(
            allLibraryFqns,
            detectableLibraryFqns,
            undetectableLibraryFqns,
            libraryName,
            contractName,
          ),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.LIBRARY_MULTIPLE_MATCHES,
        {
          contract: contractName,
          library: "LibX",
          fqnList: "  * A.sol:LibX\n  * B.sol:LibX",
        },
      );
    });
  });

  describe("getDetectableLibrariesFromBytecode", () => {
    it("should return an empty object when no linkReferences are provided", () => {
      const linkReferences = undefined;
      const bytecode = "deadbeef";

      const detectableLibraries = getDetectableLibrariesFromBytecode(
        linkReferences,
        bytecode,
      );

      assert.deepEqual(detectableLibraries, {});
    });

    it("should return an empty object when linkReferences is empty", () => {
      const linkReferences = {};
      const bytecode = "deadbeef";

      const detectableLibraries = getDetectableLibrariesFromBytecode(
        linkReferences,
        bytecode,
      );

      assert.deepEqual(detectableLibraries, {});
    });

    it("should extract a single library address correctly", () => {
      const linkReferences: CompilerOutputBytecode["linkReferences"] = {
        "contracts/Lib.sol": {
          Lib: [{ start: 1, length: 20 }],
        },
      };
      const libraryAddress = "1234567890abcdef1234567890abcdef12345678";
      const bytecode = `aa${libraryAddress}bbccddeeff`;
      const expectedLibraries: SourceLibraries = {
        "contracts/Lib.sol": {
          Lib: getPrefixedHexString(libraryAddress),
        },
      };

      const detectableLibraries = getDetectableLibrariesFromBytecode(
        linkReferences,
        bytecode,
      );

      assert.deepEqual(detectableLibraries, expectedLibraries);
    });

    it("should handle multiple libraries under one source", () => {
      const linkReferences: CompilerOutputBytecode["linkReferences"] = {
        "contracts/libs/A.sol": {
          LibA: [{ start: 2, length: 20 }],
          LibB: [{ start: 25, length: 20 }],
        },
      };
      const libAAddress = "1234567890abcdef1234567890abcdef12345678";
      const libBAddress = "abcdef1234567890abcdef1234567890abcdef12";
      const bytecode = `aabb${libAAddress}ccddee${libBAddress}ff`;
      const expectedLibraries: SourceLibraries = {
        "contracts/libs/A.sol": {
          LibA: getPrefixedHexString(libAAddress),
          LibB: getPrefixedHexString(libBAddress),
        },
      };

      const detectableLibraries = getDetectableLibrariesFromBytecode(
        linkReferences,
        bytecode,
      );

      assert.deepEqual(detectableLibraries, expectedLibraries);
    });

    it("should handle multiple sources with their libraries", () => {
      const linkReferences: CompilerOutputBytecode["linkReferences"] = {
        "contracts/libs/A.sol": {
          LibA: [{ start: 2, length: 20 }],
        },
        "contracts/libs/B.sol": {
          LibB: [{ start: 25, length: 20 }],
        },
      };
      const libAAddress = "1234567890abcdef1234567890abcdef12345678";
      const libBAddress = "abcdef1234567890abcdef1234567890abcdef12";
      const bytecode = `aabb${libAAddress}ccddee${libBAddress}ff`;
      const expectedLibraries: SourceLibraries = {
        "contracts/libs/A.sol": {
          LibA: getPrefixedHexString(libAAddress),
        },
        "contracts/libs/B.sol": {
          LibB: getPrefixedHexString(libBAddress),
        },
      };

      const result = getDetectableLibrariesFromBytecode(
        linkReferences,
        bytecode,
      );

      assert.deepEqual(result, expectedLibraries);
    });
  });

  describe("mergeLibraries", () => {
    it("should merge user and detected libraries when there are no overlaps", () => {
      const userLibraries: SourceLibraries = {
        "A.sol": { LibA: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      };
      const detectedLibraries: SourceLibraries = {
        "B.sol": { LibB: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
      };

      const mergedLibraries = mergeLibraries(userLibraries, detectedLibraries);

      assert.deepEqual(mergedLibraries, {
        "A.sol": { LibA: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
        "B.sol": { LibB: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
      });
    });

    it("should merge user and detected libraries overriding user libraries when addresses match case-insensitively", () => {
      const userLibraries: SourceLibraries = {
        "A.sol": { LibX: "0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa" },
      };
      const detectedLibraries: SourceLibraries = {
        "A.sol": { LibX: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      };

      const mergedLibraries = mergeLibraries(userLibraries, detectedLibraries);

      // detected win in merge order
      assert.deepEqual(mergedLibraries, {
        "A.sol": { LibX: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      });
    });

    it("should throw an error when user and detected libraries have the same fqn but different addresses", () => {
      const userLibraries: SourceLibraries = {
        "A.sol": { LibA: "0x1111111111111111111111111111111111111111" },
      };
      const detectedLibraries: SourceLibraries = {
        "A.sol": { LibA: "0x2222222222222222222222222222222222222222" },
      };

      assertThrowsHardhatError(
        () => mergeLibraries(userLibraries, detectedLibraries),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.LIBRARY_ADDRESSES_MISMATCH,
        {
          conflictList: `  * A.sol:LibA\ngiven address: ${userLibraries["A.sol"].LibA}\ndetected address: ${detectedLibraries["A.sol"].LibA}`,
        },
      );
    });
  });
});

function buildContractInformation(
  contract: string,
  deployedBytecode: string,
  linkReferences: CompilerOutputBytecode["linkReferences"] = {},
  deployedLinkReferences: CompilerOutputBytecode["linkReferences"] = {},
): ContractInformation {
  return {
    contract,
    contractName: "",
    compilerOutputContract: {
      evm: {
        bytecode: {
          linkReferences,
          object: "",
          opcodes: "",
          sourceMap: "",
        },
        deployedBytecode: {
          linkReferences: deployedLinkReferences,
          object: deployedBytecode,
          opcodes: "",
          sourceMap: "",
        },
        methodIdentifiers: {},
      },
      abi: undefined,
    },
    deployedBytecode,
    compilerInput: {
      language: "",
      sources: {},
      settings: {
        viaIR: undefined,
        optimizer: {
          runs: undefined,
          enabled: undefined,
          details: undefined,
        },
        metadata: undefined,
        outputSelection: {},
        evmVersion: undefined,
        libraries: undefined,
        remappings: undefined,
      },
    },
    solcLongVersion: "",
    sourceName: "",
  };
}
