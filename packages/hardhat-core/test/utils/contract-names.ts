import { assert } from "chai";

import { ERRORS } from "../../src/internal/core/errors-list";
import {
  getFullyQualifiedName,
  isFullyQualifiedName,
  parseFullyQualifiedName,
  parseName,
} from "../../src/utils/contract-names";
import { expectHardhatError } from "../helpers/errors";

describe("Solidity contract names utilities", function () {
  describe("getFullyQualifiedName", function () {
    it("Returns a fully qualified name", function () {
      assert.strictEqual(
        getFullyQualifiedName("contract.sol", "C"),
        "contract.sol:C"
      );

      assert.strictEqual(
        getFullyQualifiedName("folder/contract.sol", "C"),
        "folder/contract.sol:C"
      );

      assert.strictEqual(
        getFullyQualifiedName("folder/a:b/contract.sol", "C"),
        "folder/a:b/contract.sol:C"
      );
    });
  });

  describe("isFullyQualifiedName", function () {
    it("Correctly detects what's an FQN", function () {
      assert.isTrue(isFullyQualifiedName("contract.sol:C"));

      assert.isTrue(isFullyQualifiedName("folder/contract.sol:C"));

      assert.isTrue(isFullyQualifiedName("folder/a:b/contract.sol:C"));
    });

    it("Correctly detects what's not FQN", function () {
      assert.isFalse(isFullyQualifiedName("C"));

      assert.isFalse(isFullyQualifiedName("contract.sol"));

      assert.isFalse(isFullyQualifiedName("folder/contract.sol"));
    });
  });

  describe("parseFullyQualifiedName", function () {
    it("Parses valid FQNs correctly", function () {
      assert.deepEqual(parseFullyQualifiedName("contract.sol:C"), {
        sourceName: "contract.sol",
        contractName: "C",
      });

      assert.deepEqual(parseFullyQualifiedName("folder/contract.sol:C"), {
        sourceName: "folder/contract.sol",
        contractName: "C",
      });

      assert.deepEqual(parseFullyQualifiedName("folder/a:b/contract.sol:C"), {
        sourceName: "folder/a:b/contract.sol",
        contractName: "C",
      });
    });

    it("Throws if not a valid FQN", function () {
      expectHardhatError(
        () => parseFullyQualifiedName("C"),
        ERRORS.CONTRACT_NAMES.INVALID_FULLY_QUALIFIED_NAME
      );

      expectHardhatError(
        () => parseFullyQualifiedName("contract.sol"),
        ERRORS.CONTRACT_NAMES.INVALID_FULLY_QUALIFIED_NAME
      );

      expectHardhatError(
        () => parseFullyQualifiedName("folder/contract.sol"),
        ERRORS.CONTRACT_NAMES.INVALID_FULLY_QUALIFIED_NAME
      );
    });
  });

  describe("parseName", function () {
    it("Parses valid FQNs correctly", function () {
      assert.deepEqual(parseName("contract.sol:C"), {
        sourceName: "contract.sol",
        contractName: "C",
      });

      assert.deepEqual(parseName("folder/contract.sol:C"), {
        sourceName: "folder/contract.sol",
        contractName: "C",
      });

      assert.deepEqual(parseName("folder/a:b/contract.sol:C"), {
        sourceName: "folder/a:b/contract.sol",
        contractName: "C",
      });
    });

    it("Parses bare contract names", function () {
      assert.deepEqual(parseName("C"), {
        contractName: "C",
      });

      assert.deepEqual(parseName("Hola"), {
        contractName: "Hola",
      });
    });
  });
});
