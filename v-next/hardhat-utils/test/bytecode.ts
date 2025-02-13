import type { Artifact, LibraryAddresses } from "../src/internal/bytecode.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveLinkedBytecode, linkBytecode } from "../src/bytecode.js";
import { getUnprefixedHexString } from "../src/hex.js";

describe("bytecode", () => {
  describe("resolveLinkedBytecode", () => {
    describe("validation", () => {
      it("should throw InvalidLibraryAddressError if a library address is invalid", () => {
        const artifact: Artifact = {
          bytecode:
            "0xbytecodebytecodebytecode__$placeholderplaceholderplaceholderp$__bytecode",
          linkReferences: {
            "contracts/Library.sol": {
              Library: [{ start: 12, length: 20 }],
            },
          },
        };

        const libraries: LibraryAddresses = {
          Library: "0xnotanaddress",
        };

        assert.throws(() => resolveLinkedBytecode(artifact, libraries), {
          name: "InvalidLibraryAddressError",
          message: `The following libraries have invalid addresses:
\t* "Library": "0xnotanaddress"

Please provide valid Ethereum addresses for these libraries.`,
        });
      });

      it("should throw AmbiguousLibraryNameError if a library name matches multiple needed libraries", () => {
        const artifact: Artifact = {
          bytecode:
            "0xbytecodebytecodebytecode__$placeholderplaceholderplaceholderp$__bytecode__$placeholderplaceholderplaceholderp$__",
          linkReferences: {
            "contracts/Foo.sol": {
              Library: [{ start: 12, length: 20 }],
            },
            "contracts/Bar.sol": {
              Library: [{ start: 36, length: 20 }],
            },
          },
        };

        const libraries: LibraryAddresses = {
          Library: "0x1234567890123456789012345678901234567890",
        };

        assert.throws(() => resolveLinkedBytecode(artifact, libraries), {
          name: "AmbiguousLibraryNameError",
          message: `The following libraries may resolve to multiple libraries:
\t* "Library":
\t\t* "contracts/Foo.sol:Library"
\t\t* "contracts/Bar.sol:Library"

Please provide the fully qualified name for these libraries.`,
        });
      });

      it("should throw UnnecessaryLibraryError if an unnecessary library is provided", () => {
        const artifact: Artifact = {
          bytecode: "0xbytecodebytecodebytecode",
          linkReferences: {},
        };

        const libraries: LibraryAddresses = {
          Library: "0x1234567890123456789012345678901234567890",
        };

        assert.throws(() => resolveLinkedBytecode(artifact, libraries), {
          name: "UnnecessaryLibraryError",
          message: `The following libraries are not referenced by the contract:
\t* "Library"

Please provide only the libraries that are needed.`,
        });
      });

      it("should throw OverlappingLibrariesError if a library is provided more than once", () => {
        const artifact: Artifact = {
          bytecode:
            "0xbytecodebytecodebytecode__$placeholderplaceholderplaceholderp$__bytecode",
          linkReferences: {
            "contracts/Library.sol": {
              Library: [{ start: 12, length: 20 }],
            },
          },
        };

        const libraries: LibraryAddresses = {
          "contracts/Library.sol:Library":
            "0x1234567890123456789012345678901234567890",
          Library: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        };

        assert.throws(() => resolveLinkedBytecode(artifact, libraries), {
          name: "OverlappingLibrariesError",
          message: `The following libraries are provided more than once:
\t* "contracts/Library.sol:Library"

Please ensure that each library is provided only once, either by its name or its fully qualified name.`,
        });
      });

      it("should throw MissingLibrariesError if a needed library is missing", () => {
        const artifact: Artifact = {
          bytecode:
            "0xbytecodebytecodebytecode__$placeholderplaceholderplaceholderp$__bytecode",
          linkReferences: {
            "contracts/Library.sol": {
              Library: [{ start: 12, length: 20 }],
            },
          },
        };

        assert.throws(() => resolveLinkedBytecode(artifact, {}), {
          name: "MissingLibrariesError",
          message: `The following libraries are missing:
\t* "contracts/Library.sol:Library"

Please provide all the required libraries.`,
        });
      });
    });

    describe("linking", () => {
      it("should link a contract with a library", () => {
        const artifact: Artifact = {
          bytecode:
            "0xbytecodebytecodebytecode__$placeholderplaceholderplaceholderp$__bytecode",
          linkReferences: {
            "contracts/Library.sol": {
              // The start position of the reference doesn't take into account
              // the "0x" prefix of the bytecode.
              Library: [{ start: 12, length: 20 }],
            },
          },
        };
        const library1Fqn = "contracts/Library.sol:Library";
        const libraries: LibraryAddresses = {
          [library1Fqn]: "0x1234567890123456789012345678901234567890",
        };
        const expectedBytecode = `0xbytecodebytecodebytecode${getUnprefixedHexString(libraries[library1Fqn])}bytecode`;

        assert.equal(
          resolveLinkedBytecode(artifact, libraries),
          expectedBytecode,
        );
      });

      it("should link a contract with multiple libraries", () => {
        const artifact: Artifact = {
          bytecode:
            "0xbytecodebytecodebytecode__$placeholderplaceholderplaceholderp$__bytecode__$placeholderplaceholderplaceholderp$__bytecodebytecodebytecode__$placeholderplaceholderplaceholderp$____$placeholderplaceholderplaceholderp$__",
          linkReferences: {
            "contracts/Foo.sol": {
              Library1: [
                { start: 12, length: 20 },
                { start: 36, length: 20 },
              ],
              Library2: [{ start: 88, length: 20 }],
            },
            "contracts/Bar.sol": {
              Library3: [{ start: 68, length: 20 }],
            },
          },
        };
        const library1Fqn = "contracts/Foo.sol:Library1";
        const library2Fqn = "contracts/Foo.sol:Library2";
        const library3Fqn = "contracts/Bar.sol:Library3";
        const libraries: LibraryAddresses = {
          [library1Fqn]: "0x1234567890123456789012345678901234567890",
          [library2Fqn]: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          [library3Fqn]: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        };

        const expectedBytecode = `0xbytecodebytecodebytecode${getUnprefixedHexString(libraries[library1Fqn])}bytecode${getUnprefixedHexString(libraries[library1Fqn])}bytecodebytecodebytecode${getUnprefixedHexString(libraries[library3Fqn])}${getUnprefixedHexString(libraries[library2Fqn])}`;

        assert.equal(
          resolveLinkedBytecode(artifact, libraries),
          expectedBytecode,
        );
      });

      it("should allow library names without source names if they are unique", () => {
        const artifact: Artifact = {
          bytecode:
            "0xbytecodebytecodebytecode__$placeholderplaceholderplaceholderp$__bytecode__$placeholderplaceholderplaceholderp$__bytecodebytecodebytecode__$placeholderplaceholderplaceholderp$____$placeholderplaceholderplaceholderp$__",
          linkReferences: {
            "contracts/Foo.sol": {
              Library1: [
                { start: 12, length: 20 },
                { start: 36, length: 20 },
              ],
              Library2: [{ start: 88, length: 20 }],
            },
            "contracts/Bar.sol": {
              Library3: [{ start: 68, length: 20 }],
            },
          },
        };
        const libraries: LibraryAddresses = {
          Library1: "0x1234567890123456789012345678901234567890",
          Library2: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          Library3: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        };

        const expectedBytecode = `0xbytecodebytecodebytecode${getUnprefixedHexString(libraries.Library1)}bytecode${getUnprefixedHexString(libraries.Library1)}bytecodebytecodebytecode${getUnprefixedHexString(libraries.Library3)}${getUnprefixedHexString(libraries.Library2)}`;

        assert.equal(
          resolveLinkedBytecode(artifact, libraries),
          expectedBytecode,
        );
      });
    });
  });

  describe("linkBytecode", () => {
    it("should link a contract with a library", () => {
      const artifact: Artifact = {
        bytecode:
          "0xbytecodebytecodebytecode__$placeholderplaceholderplaceholderp$__bytecode",
        linkReferences: {
          "contracts/Library.sol": {
            // The start position of the reference doesn't take into account
            // the "0x" prefix of the bytecode.
            Library: [{ start: 12, length: 20 }],
          },
        },
      };
      const libraries = [
        {
          sourceName: "contracts/Library.sol",
          libraryName: "Library",
          libraryFqn: "contracts/Library.sol:Library",
          address: "0x1234567890123456789012345678901234567890",
        },
      ];
      const expectedBytecode = `0xbytecodebytecodebytecode${getUnprefixedHexString(libraries[0].address)}bytecode`;

      assert.equal(linkBytecode(artifact, libraries), expectedBytecode);
    });

    it("should link a contract with multiple libraries", () => {
      const artifact: Artifact = {
        bytecode:
          "0xbytecodebytecodebytecode__$placeholderplaceholderplaceholderp$__bytecode__$placeholderplaceholderplaceholderp$__bytecodebytecodebytecode__$placeholderplaceholderplaceholderp$____$placeholderplaceholderplaceholderp$__",
        linkReferences: {
          "contracts/Foo.sol": {
            Library1: [
              { start: 12, length: 20 },
              { start: 36, length: 20 },
            ],
            Library2: [{ start: 88, length: 20 }],
          },
          "contracts/Bar.sol": {
            Library3: [{ start: 68, length: 20 }],
          },
        },
      };
      const libraries = [
        {
          sourceName: "contracts/Foo.sol",
          libraryName: "Library1",
          libraryFqn: "contracts/Foo.sol:Library1",
          address: "0x1234567890123456789012345678901234567890",
        },
        {
          sourceName: "contracts/Foo.sol",
          libraryName: "Library2",
          libraryFqn: "contracts/Foo.sol:Library2",
          address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
        {
          sourceName: "contracts/Bar.sol",
          libraryName: "Library3",
          libraryFqn: "contracts/Bar.sol:Library3",
          address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ];
      const [library1, library2, library3] = libraries;

      const expectedBytecode = `0xbytecodebytecodebytecode${getUnprefixedHexString(library1.address)}bytecode${getUnprefixedHexString(library1.address)}bytecodebytecodebytecode${getUnprefixedHexString(library3.address)}${getUnprefixedHexString(library2.address)}`;

      assert.equal(linkBytecode(artifact, libraries), expectedBytecode);
    });

    it("should return the same bytecode if no libraries are provided", () => {
      const artifact: Artifact = {
        bytecode:
          "0xbytecodebytecodebytecode__$placeholderplaceholderplaceholderp$__bytecode",
        linkReferences: {
          "contracts/Library.sol": {
            Library: [{ start: 12, length: 20 }],
          },
        },
      };

      assert.equal(linkBytecode(artifact, []), artifact.bytecode);
    });

    it("should return the same bytecode if there are no libraries to link", () => {
      const artifact: Artifact = {
        bytecode: "0xbytecodebytecodebytecode",
        linkReferences: {},
      };
      const libraries = [
        {
          sourceName: "contracts/Library.sol",
          libraryName: "Library",
          libraryFqn: "contracts/Library.sol:Library",
          address: "0x1234567890123456789012345678901234567890",
        },
      ];
      assert.equal(linkBytecode(artifact, libraries), artifact.bytecode);
    });
  });
});
