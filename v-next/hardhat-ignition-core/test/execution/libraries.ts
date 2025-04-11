import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { assert } from "chai";

import {
  linkLibraries,
  validateLibraryNames,
} from "../../src/internal/execution/libraries.js";
import { assertValidationError } from "../helpers.js";
import { deploymentFixturesArtifacts } from "../helpers/execution-result-fixtures.js";

const mockAddress = "0x1122334455667788990011223344556677889900";
const mockAddress2 = "0x0011223344556677889900112233445566778899";

describe("Libraries handling", () => {
  describe("validateLibraryNames", () => {
    it("Should not throw if all libraries are provided, no name is ambiguos, repreated or not recognized", () => {
      assert.doesNotThrow(() => {
        validateLibraryNames(deploymentFixturesArtifacts.WithLibrary, ["Lib"]);
      });
    });

    it("Should throw if a library name is not recognized", async () => {
      assertValidationError(
        validateLibraryNames(deploymentFixturesArtifacts.WithLibrary, [
          "NotALibrary",
        ]).map((e) => e.message),
        "Invalid library NotALibrary for contract WithLibrary: this library is not needed by this contract.",
      );
    });

    it("Should throw if a library name is ambiguous", () => {
      const [error] = validateLibraryNames(
        deploymentFixturesArtifacts.WithAmbiguousLibraryName,
        ["Lib"],
      ).map((e) => e.message);

      assert(error !== undefined);
      assert.include(error, `The name "Lib" is ambiguous`);
      assert.include(error, `contracts/C.sol:Lib`);
      assert.include(error, `contracts/Libs.sol:Lib`);
    });

    it("Should throw if a library is missing", () => {
      const [error] = validateLibraryNames(
        deploymentFixturesArtifacts.WithLibrary,
        [],
      ).map((e) => e.message);

      assert(error !== undefined);
      assert.include(error, `The following libraries are missing:`);
      assert.include(error, `contracts/C.sol:Lib`);
    });

    it("Should throw if a name is used twice, as FQN and bare name", () => {
      assertValidationError(
        validateLibraryNames(deploymentFixturesArtifacts.WithLibrary, [
          "Lib",
          "contracts/C.sol:Lib",
        ]).map((e) => e.message),
        `Invalid libraries for contract WithLibrary: The names 'contracts/C.sol:Lib' and 'Lib' clash with each other, please use qualified names for both.`,
      );
    });

    it("Should accept bare names if non-ambiguous", () => {
      assert.doesNotThrow(() => {
        validateLibraryNames(deploymentFixturesArtifacts.WithLibrary, ["Lib"]);
      });
    });

    it("Should accept fully qualified names", () => {
      assert.doesNotThrow(() => {
        validateLibraryNames(deploymentFixturesArtifacts.WithLibrary, [
          "contracts/C.sol:Lib",
        ]);
      });
    });
  });

  describe("linkLibraries", () => {
    it("Should validate that the librearies addressses are valid", () => {
      assertThrowsHardhatError(
        () => {
          linkLibraries(deploymentFixturesArtifacts.WithLibrary, {
            Lib: "asd",
          });
        },
        HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_LIBRARY_ADDRESS,
        {
          libraryName: "Lib",
          address: "asd",
          contractName: "WithLibrary",
        },
      );
    });

    it("Should link ambigous libraries correctly", () => {
      const linkedBytecode = linkLibraries(
        deploymentFixturesArtifacts.WithAmbiguousLibraryName,
        {
          ["contracts/Libs.sol:Lib"]: mockAddress,
          ["contracts/C.sol:Lib"]: mockAddress2,
        },
      );

      // We don't really validate if they were linked correctly here
      assert.include(linkedBytecode, mockAddress.slice(2));
      assert.include(linkedBytecode, mockAddress2.slice(2));
    });

    it("Should link by bare name", () => {
      const linkedBytecode = linkLibraries(
        deploymentFixturesArtifacts.WithLibrary,
        {
          Lib: mockAddress,
        },
      );

      assert.include(linkedBytecode, mockAddress.slice(2));

      const firstRef =
        deploymentFixturesArtifacts.WithLibrary.linkReferences[
          "contracts/C.sol"
        ].Lib[0];

      assert.equal(
        linkedBytecode.slice(
          firstRef.start * 2 + 2,
          firstRef.start * 2 + 2 + firstRef.length * 2,
        ),
        mockAddress.slice(2),
      );
    });
  });
});
