import { assert } from "chai";

import {
  linkLibraries,
  validateLibraryNames,
} from "../../../src/new-api/internal/new-execution/libraries";
import { deploymentFixturesArtifacts } from "../../helpers/execution-result-fixtures";

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
      assert.throws(() => {
        validateLibraryNames(deploymentFixturesArtifacts.WithLibrary, [
          "NotALibrary",
        ]);
      }, "not needed");
    });

    it("Should throw if a library name is ambiguous", () => {
      try {
        validateLibraryNames(
          deploymentFixturesArtifacts.WithAmbiguousLibraryName,
          ["Lib"]
        );
      } catch (error: any) {
        assert.include(error.message, `The name "Lib" is ambiguous`);
        assert.include(error.message, `contracts/C.sol:Lib`);
        assert.include(error.message, `contracts/Libs.sol:Lib`);
        return;
      }

      assert.fail("Should have thrown");
    });

    it("Should throw if a library is missing", () => {
      try {
        validateLibraryNames(deploymentFixturesArtifacts.WithLibrary, []);
      } catch (error: any) {
        assert.include(error.message, `The following libraries are missing:`);
        assert.include(error.message, `contracts/C.sol:Lib`);
        return;
      }

      assert.fail("Should have thrown");
    });

    it("Should throw if a name is used twice, as FQN and bare name", () => {
      assert.throws(() => {
        validateLibraryNames(deploymentFixturesArtifacts.WithLibrary, [
          "Lib",
          "contracts/C.sol:Lib",
        ]);
      }, `The names "contracts/C.sol:Lib" and "Lib" clash with each other`);
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
      assert.throws(() => {
        linkLibraries(deploymentFixturesArtifacts.WithLibrary, {
          Lib: "asd",
        });
      }, `Invalid address asd for library Lib of contract WithLibrary`);
    });

    it("Should link ambigous libraries correctly", () => {
      const linkedBytecode = linkLibraries(
        deploymentFixturesArtifacts.WithAmbiguousLibraryName,
        {
          ["contracts/Libs.sol:Lib"]: mockAddress,
          ["contracts/C.sol:Lib"]: mockAddress2,
        }
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
        }
      );

      assert.include(linkedBytecode, mockAddress.slice(2));

      const firstRef =
        deploymentFixturesArtifacts.WithLibrary.linkReferences[
          "contracts/C.sol"
        ].Lib[0];

      assert.equal(
        linkedBytecode.slice(
          firstRef.start * 2 + 2,
          firstRef.start * 2 + 2 + firstRef.length * 2
        ),
        mockAddress.slice(2)
      );
    });
  });
});
