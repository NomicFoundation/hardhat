import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { CompilerOutputBytecode } from "hardhat/types/solidity";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import {
  bytesToHexString,
  getPrefixedHexString,
  getUnprefixedHexString,
} from "@nomicfoundation/hardhat-utils/hex";
import { encode } from "cbor2";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import {
  Bytecode,
  inferExecutableSection,
  nullifyBytecodeOffsets,
  getLibraryOffsets,
  getImmutableOffsets,
  getCallProtectionOffsets,
} from "../src/internal/bytecode.js";
import {
  METADATA_LENGTH_FIELD_SIZE,
  MISSING_METADATA_VERSION_RANGE,
  SOLC_NOT_FOUND_IN_METADATA_VERSION_RANGE,
} from "../src/internal/metadata.js";

import { MockEthereumProvider } from "./utils.js";

describe("bytecode", () => {
  describe("Bytecode class", () => {
    const address = "0x1234567890abcdef1234567890abcdef12345678";
    const networkName = "testnet";

    describe("getDeployedContractBytecode", () => {
      it("should create a Bytecode instance from the deployed bytecode", async () => {
        const metadata = { solc: new Uint8Array([0, 8, 30]) }; // [major, minor, patch]
        const encodedMetadata = encode(metadata);
        const metadataSection = getUnprefixedHexString(
          bytesToHexString(encodedMetadata),
        );
        const executableSection = "deadbeefcafebabe"; // dummy bytecode

        const bytecode = buildBytecode(executableSection, metadataSection);

        const provider = new MockEthereumProvider({
          eth_getCode: getPrefixedHexString(bytecode),
        });

        const deployedBytecode = await Bytecode.getDeployedContractBytecode(
          provider,
          address,
          networkName,
        );

        assert.equal(deployedBytecode.solcVersion, "0.8.30");
        assert.equal(deployedBytecode.bytecode, bytecode);
        assert.equal(deployedBytecode.executableSection, executableSection);
      });

      it("should throw if the bytecode is empty", async () => {
        const provider = new MockEthereumProvider({
          eth_getCode: "0x",
        });

        await assertRejectsWithHardhatError(
          Bytecode.getDeployedContractBytecode(provider, address, networkName),
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL
            .DEPLOYED_BYTECODE_NOT_FOUND,
          {
            address,
            networkName,
          },
        );
      });
    });

    describe("hasVersionRange", () => {
      it("should return true if the solc version is a range - MISSING_METADATA_VERSION_RANGE", async () => {
        const executableSection = "deadbeefcafebabe"; // dummy bytecode

        const bytecode = buildBytecode(executableSection, "");

        const provider = new MockEthereumProvider({
          eth_getCode: getPrefixedHexString(bytecode),
        });

        const deployedBytecode = await Bytecode.getDeployedContractBytecode(
          provider,
          address,
          networkName,
        );

        assert.equal(
          deployedBytecode.solcVersion,
          MISSING_METADATA_VERSION_RANGE,
        );
        assert.equal(deployedBytecode.hasVersionRange(), true);
      });

      it("should return true if the solc version is a range - SOLC_NOT_FOUND_IN_METADATA_VERSION_RANGE", async () => {
        const metadata = {};
        const encodedMetadata = encode(metadata);
        const metadataSection = getUnprefixedHexString(
          bytesToHexString(encodedMetadata),
        );
        const executableSection = "deadbeefcafebabe"; // dummy bytecode

        const bytecode = buildBytecode(executableSection, metadataSection);

        const provider = new MockEthereumProvider({
          eth_getCode: getPrefixedHexString(bytecode),
        });

        const deployedBytecode = await Bytecode.getDeployedContractBytecode(
          provider,
          address,
          networkName,
        );

        assert.equal(
          deployedBytecode.solcVersion,
          SOLC_NOT_FOUND_IN_METADATA_VERSION_RANGE,
        );
        assert.equal(deployedBytecode.hasVersionRange(), true);
      });

      it("should return false if the solc version is not a range", async () => {
        const metadata = { solc: new Uint8Array([0, 6, 0]) }; // [major, minor, patch]
        const encodedMetadata = encode(metadata);
        const metadataSection = getUnprefixedHexString(
          bytesToHexString(encodedMetadata),
        );
        const executableSection = "deadbeefcafebabe"; // dummy bytecode

        const bytecode = buildBytecode(executableSection, metadataSection);

        const provider = new MockEthereumProvider({
          eth_getCode: getPrefixedHexString(bytecode),
        });

        const deployedBytecode = await Bytecode.getDeployedContractBytecode(
          provider,
          address,
          networkName,
        );

        assert.equal(deployedBytecode.solcVersion, "0.6.0");
        assert.equal(deployedBytecode.hasVersionRange(), false);
      });
    });

    describe("compare", () => {
      it("should return true when executable sections match exactly and metadata is the same", async () => {
        const metadata = { solc: new Uint8Array([0, 8, 30]) }; // [major, minor, patch]
        const encodedMetadata = encode(metadata);
        const metadataSection = getUnprefixedHexString(
          bytesToHexString(encodedMetadata),
        );
        const executableSection = "deadbeefcafebabe"; // dummy bytecode

        const bytecode = buildBytecode(executableSection, metadataSection);

        const provider = new MockEthereumProvider({
          eth_getCode: getPrefixedHexString(bytecode),
        });

        const deployedBytecode = await Bytecode.getDeployedContractBytecode(
          provider,
          address,
          networkName,
        );

        const output = buildCompilerOutputBytecode(bytecode);

        assert.equal(deployedBytecode.compare(output), true);
      });

      it("should return true when executable sections match exactly and metadata is different", async () => {
        const metadata = { solc: new Uint8Array([0, 8, 30]) }; // [major, minor, patch]
        const encodedMetadata = encode(metadata);
        const metadataSection = getUnprefixedHexString(
          bytesToHexString(encodedMetadata),
        );
        const executableSection = "deadbeefcafebabe"; // dummy bytecode

        const bytecode = buildBytecode(executableSection, metadataSection);

        const provider = new MockEthereumProvider({
          eth_getCode: getPrefixedHexString(bytecode),
        });

        const deployedBytecode = await Bytecode.getDeployedContractBytecode(
          provider,
          address,
          networkName,
        );

        const output = buildCompilerOutputBytecode(
          buildBytecode(executableSection, ""),
        );

        assert.equal(deployedBytecode.compare(output), true);
      });

      it("should return false when executable sections do not match", async () => {
        const metadata = { solc: new Uint8Array([0, 8, 30]) }; // [major, minor, patch]
        const encodedMetadata = encode(metadata);
        const metadataSection = getUnprefixedHexString(
          bytesToHexString(encodedMetadata),
        );
        const executableSection = "deadbeefcafebabe"; // dummy bytecode

        const bytecode = buildBytecode(executableSection, metadataSection);

        const provider = new MockEthereumProvider({
          eth_getCode: getPrefixedHexString(bytecode),
        });

        const deployedBytecode = await Bytecode.getDeployedContractBytecode(
          provider,
          address,
          networkName,
        );

        // compiler output with one extra hex char in executable section
        const output = buildCompilerOutputBytecode(
          buildBytecode(executableSection + "ae", ""),
        );

        assert.equal(deployedBytecode.compare(output), false);
      });

      it("should normalize library link references and immutable references", async () => {
        const metadata = { solc: new Uint8Array([0, 8, 30]) }; // [major, minor, patch]
        const encodedMetadata = encode(metadata);
        const metadataSection = getUnprefixedHexString(
          bytesToHexString(encodedMetadata),
        );
        const deployedLibraryAddress =
          "1234567890abcdef1234567890abcdef12345678"; // 20 bytes = 40 hex chars
        const deployedImmutableReference =
          "abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdabcdefabcdef"; // 32 bytes = 64 hex chars
        const libraryPlaceholder = "____11111111111111111111111111111111____";
        const immutablePlaceholder =
          "____11111111111111111111111111111111111111111111111111111111____";

        // deployed bytecode: real library address and immutable reference
        // at bytes 3 and 28 respectively
        const bytecode = buildBytecode(
          `deadbe${deployedLibraryAddress}efcafebabe${deployedImmutableReference}`,
          metadataSection,
        );

        const provider = new MockEthereumProvider({
          eth_getCode: getPrefixedHexString(bytecode),
        });

        const deployedBytecode = await Bytecode.getDeployedContractBytecode(
          provider,
          address,
          networkName,
        );

        const linkReferences: CompilerOutputBytecode["linkReferences"] = {
          "dummy.sol": {
            MyLib: [
              {
                start: 3,
                length: 20,
              },
            ],
          },
        };

        const immutableReferences: CompilerOutputBytecode["immutableReferences"] =
          {
            "280": [
              {
                start: 28,
                length: 32,
              },
            ],
          };

        const output = buildCompilerOutputBytecode(
          // compiled bytecode: placeholders in same positions
          buildBytecode(
            `deadbe${libraryPlaceholder}efcafebabe${immutablePlaceholder}`,
            metadataSection,
          ),
          linkReferences,
          immutableReferences,
        );

        assert.equal(deployedBytecode.compare(output), true);
      });
    });
  });

  describe("inferExecutableSection", () => {
    it("should strip the metadata section from the bytecode", () => {
      const executableSection = "deadbeef";
      const metadataSection = "cafebabe";
      const bytecode = buildBytecode(executableSection, metadataSection);

      assert.equal(inferExecutableSection(bytecode), executableSection);
    });

    it("should handle bytecode prefixed with 0x", () => {
      const executableSection = "cafed00d";
      const metadataSection = "112233";
      const bytecode = getPrefixedHexString(
        buildBytecode(executableSection, metadataSection),
      );

      assert.equal(inferExecutableSection(bytecode), executableSection);
    });

    it("should return the entire bytecode if it's less than the metadata length field size", () => {
      const bytecode = "0xab"; // less than METADATA_LENGTH_FIELD_SIZE * 2 chars

      assert.equal(
        inferExecutableSection(bytecode),
        getUnprefixedHexString(bytecode),
      );
    });

    it("should return the entire bytecode if the metadata length field size is invalid", () => {
      const fakeLength = "ffff"; // huge length
      const bytecode = "0123" + fakeLength;

      assert.equal(
        inferExecutableSection(bytecode),
        getUnprefixedHexString(bytecode),
      );
    });
  });

  describe("nullifyBytecodeOffsets", () => {
    useEphemeralFixtureProject("default");

    let hre: HardhatRuntimeEnvironment;
    before(async () => {
      const hardhatUserConfig =
        // eslint-disable-next-line import/no-relative-packages -- allowed in test
        (await import("./fixture-projects/default/hardhat.config.js")).default;
      hre = await createHardhatRuntimeEnvironment(hardhatUserConfig);
      await hre.tasks.getTask("build").run();
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

function buildBytecode(
  executableSection: string,
  metadataSection: string,
): string {
  // calculate the length of the metadata section in bytes
  // and pad it to the required size
  const metadataBytesLength = metadataSection.length / 2;
  const metadataSectionLength = metadataBytesLength
    .toString(16)
    .padStart(METADATA_LENGTH_FIELD_SIZE * 2, "0");

  return executableSection + metadataSection + metadataSectionLength;
}

function buildCompilerOutputBytecode(
  bytecode: string,
  linkReferences: CompilerOutputBytecode["linkReferences"] = {},
  immutableReferences: CompilerOutputBytecode["immutableReferences"] = {},
): CompilerOutputBytecode {
  return {
    object: bytecode,
    opcodes: "",
    sourceMap: "",
    linkReferences,
    immutableReferences,
  };
}
