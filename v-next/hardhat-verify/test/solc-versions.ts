import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  resolveSupportedSolcVersions,
  filterVersionsByRange,
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
      };
      const expected = ["0.8.18", "0.7.2", "0.4.11"];

      const supportedSolcVersions =
        await resolveSupportedSolcVersions(solidityConfig);

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
      };
      const expected = ["0.5.5", "0.6.4"];

      const supportedSolcVersions =
        await resolveSupportedSolcVersions(solidityConfig);

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
      };
      const expected = ["0.8.18", "0.7.2", "0.5.5", "0.6.4"];

      const supportedSolcVersions =
        await resolveSupportedSolcVersions(solidityConfig);

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
      };
      const expected = ["0.8.18", "0.8.18"];

      const supportedSolcVersions =
        await resolveSupportedSolcVersions(solidityConfig);

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
      };

      await assertRejectsWithHardhatError(
        resolveSupportedSolcVersions(solidityConfig),
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
      };

      await assertRejectsWithHardhatError(
        resolveSupportedSolcVersions(solidityConfig),
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.SOLC_VERSION_NOT_SUPPORTED,
        {
          unsupportedSolcVersions: ["0.3.5"],
        },
      );
    });
  });

  describe("filterVersionsByRange", () => {
    it("should return the versions that satisfy the given range", async () => {
      const versions = ["0.8.18", "0.7.2", "0.4.11", "0.3.5"];
      const range = ">=0.4.11";

      const filteredVersions = await filterVersionsByRange(versions, range);

      assert.deepEqual(filteredVersions, ["0.8.18", "0.7.2", "0.4.11"]);
    });

    it("should return an empty array if no versions satisfy the given range", async () => {
      const versions = ["0.3.5", "0.2.1"];
      const range = ">=0.4.11";

      const filteredVersions = await filterVersionsByRange(versions, range);

      assert.deepEqual(filteredVersions, []);
    });
  });
});
