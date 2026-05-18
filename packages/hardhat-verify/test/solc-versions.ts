import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  filterVersionsByInferred,
  resolveSupportedSolcVersions,
} from "../src/internal/solc-versions.js";

describe("solc-versions", () => {
  describe("resolveSupportedSolcVersions", () => {
    it("should return the list of compiler versions defined in the hardhat config (compilers)", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.7.2",
            settings: {},
          },
          {
            version: "0.4.11",
            settings: {},
          },
        ],
        overrides: {},
        isolated: false,
        preferWasm: false,
      };
      const expected = ["0.8.18", "0.7.2", "0.4.11"];

      const supportedSolcVersions =
        resolveSupportedSolcVersions(solidityConfig);

      assert.deepEqual(supportedSolcVersions, expected);
    });

    it("should return the list of compiler versions defined in the hardhat config (overrides)", async () => {
      const solidityConfig = {
        compilers: [],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.5.5",
            settings: {},
          },
          "contracts/Bar.sol": {
            version: "0.6.4",
            settings: {},
          },
        },
        isolated: false,
        preferWasm: false,
      };
      const expected = ["0.5.5", "0.6.4"];

      const supportedSolcVersions =
        resolveSupportedSolcVersions(solidityConfig);

      assert.deepEqual(supportedSolcVersions, expected);
    });

    it("should return the list of compiler versions defined in the hardhat config (compilers + overrides)", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.7.2",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.5.5",
            settings: {},
          },
          "contracts/Bar.sol": {
            version: "0.6.4",
            settings: {},
          },
        },
        isolated: false,
        preferWasm: false,
      };
      const expected = ["0.8.18", "0.7.2", "0.5.5", "0.6.4"];

      const supportedSolcVersions =
        resolveSupportedSolcVersions(solidityConfig);

      assert.deepEqual(supportedSolcVersions, expected);
    });

    it("should return the list of compiler versions defined in the hardhat config (compilers + overrides with same version)", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.8.18",
            settings: {},
          },
        },
        isolated: false,
        preferWasm: false,
      };
      const expected = ["0.8.18", "0.8.18"];

      const supportedSolcVersions =
        resolveSupportedSolcVersions(solidityConfig);

      assert.deepEqual(supportedSolcVersions, expected);
    });

    it("should throw if any version is below Etherscan supported version (compilers)", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.4.10",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.8.15",
            settings: {},
          },
        },
        isolated: false,
        preferWasm: false,
      };

      assertThrowsHardhatError(
        () => resolveSupportedSolcVersions(solidityConfig),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.SOLC_VERSION_NOT_SUPPORTED,
        {
          unsupportedSolcVersions: ["0.4.10"],
        },
      );
    });

    it("should throw if any version is below Etherscan supported version (overrides)", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "0.7.6",
            settings: {},
          },
        ],
        overrides: {
          "contracts/Foo.sol": {
            version: "0.3.5",
            settings: {},
          },
        },
        isolated: false,
        preferWasm: false,
      };

      assertThrowsHardhatError(
        () => resolveSupportedSolcVersions(solidityConfig),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.SOLC_VERSION_NOT_SUPPORTED,
        {
          unsupportedSolcVersions: ["0.3.5"],
        },
      );
    });

    it("should treat malformed versions as unsupported", async () => {
      const solidityConfig = {
        compilers: [
          {
            version: "0.8.18",
            settings: {},
          },
          {
            version: "not-a-version",
            settings: {},
          },
        ],
        overrides: {},
        isolated: false,
        preferWasm: false,
      };

      assertThrowsHardhatError(
        () => resolveSupportedSolcVersions(solidityConfig),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.SOLC_VERSION_NOT_SUPPORTED,
        {
          unsupportedSolcVersions: ["not-a-version"],
        },
      );
    });
  });

  describe("filterVersionsByInferred", () => {
    const versions = ["0.4.10", "0.4.11", "0.5.0", "0.5.8", "0.5.9", "0.8.18"];

    describe("exact", () => {
      it("should keep only the matching version", () => {
        assert.deepEqual(
          filterVersionsByInferred(versions, {
            type: "exact",
            version: [0, 5, 9],
          }),
          ["0.5.9"],
        );
      });

      it("should return an empty array when no version matches", () => {
        assert.deepEqual(
          filterVersionsByInferred(versions, {
            type: "exact",
            version: [0, 7, 0],
          }),
          [],
        );
      });
    });

    describe("lessThan", () => {
      it("should keep versions strictly below the bound", () => {
        assert.deepEqual(
          filterVersionsByInferred(versions, {
            type: "lessThan",
            bound: [0, 4, 11],
          }),
          ["0.4.10"],
        );
      });

      it("should exclude the bound itself", () => {
        assert.deepEqual(
          filterVersionsByInferred(["0.4.7", "0.4.6"], {
            type: "lessThan",
            bound: [0, 4, 7],
          }),
          ["0.4.6"],
        );
      });
    });

    describe("between", () => {
      it("should keep versions in the closed range", () => {
        assert.deepEqual(
          filterVersionsByInferred(versions, {
            type: "between",
            min: [0, 4, 7],
            max: [0, 5, 8],
          }),
          ["0.4.10", "0.4.11", "0.5.0", "0.5.8"],
        );
      });

      it("should include both endpoints", () => {
        assert.deepEqual(
          filterVersionsByInferred(["0.4.7", "0.5.8"], {
            type: "between",
            min: [0, 4, 7],
            max: [0, 5, 8],
          }),
          ["0.4.7", "0.5.8"],
        );
      });

      it("should return an empty array when no version is in range", () => {
        assert.deepEqual(
          filterVersionsByInferred(["0.3.5", "0.6.0"], {
            type: "between",
            min: [0, 4, 7],
            max: [0, 5, 8],
          }),
          [],
        );
      });
    });

    describe("malformed versions", () => {
      it("should silently filter out malformed versions for any inferred type", () => {
        const mixed = ["0.5.9", "not-a-version", "0.8", "0.4.11"];
        assert.deepEqual(
          filterVersionsByInferred(mixed, {
            type: "exact",
            version: [0, 5, 9],
          }),
          ["0.5.9"],
        );
        assert.deepEqual(
          filterVersionsByInferred(mixed, {
            type: "lessThan",
            bound: [0, 5, 0],
          }),
          ["0.4.11"],
        );
        assert.deepEqual(
          filterVersionsByInferred(mixed, {
            type: "between",
            min: [0, 4, 0],
            max: [0, 6, 0],
          }),
          ["0.5.9", "0.4.11"],
        );
      });
    });
  });
});
