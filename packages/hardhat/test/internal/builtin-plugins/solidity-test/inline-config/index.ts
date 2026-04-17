// cSpell:ignore aabbccdd
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  getFunctionFqn,
  getTestFunctionOverrides,
} from "../../../../../src/internal/builtin-plugins/solidity-test/inline-config/index.js";

import { makeBuildInfo, makeTestSuiteArtifact } from "./mocks.js";

describe("inline-config", () => {
  describe("getTestFunctionOverrides", () => {
    it("should return empty array when no build infos contain inline config", async () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "// just a comment\ncontract MyTest {}",
        {
          MyTest: {
            methodIdentifiers: { "testFoo()": "aabbccdd" },
            functions: [{ name: "testFoo", documentation: null }],
          },
        },
      );
      const artifacts = [makeTestSuiteArtifact("test/MyTest.sol", "MyTest")];
      assert.deepEqual(await getTestFunctionOverrides(artifacts, [bi]), []);
    });

    it("should deduplicate when same source appears in multiple build infos", async () => {
      const bi1 = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
        },
      );
      const bi2 = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
        },
      );
      const artifacts = [makeTestSuiteArtifact("test/MyTest.sol", "MyTest")];
      const overrides = await getTestFunctionOverrides(artifacts, [bi1, bi2]);
      assert.equal(overrides.length, 1);
    });

    it("should produce correct ArtifactId with solcVersion", async () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
        },
        "0.8.20",
      );
      const artifacts = [
        makeTestSuiteArtifact("test/MyTest.sol", "MyTest", "0.8.20"),
      ];
      const overrides = await getTestFunctionOverrides(artifacts, [bi]);
      assert.deepEqual(overrides[0].identifier.contractArtifact, {
        name: "MyTest",
        source: "test/MyTest.sol",
        solcVersion: "0.8.20",
      });
    });

    it("should throw UNRESOLVED_SELECTOR when function has no ABI entry", async () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10",
        {
          MyTest: {
            methodIdentifiers: {},
            functions: [
              {
                name: "testHelper",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
        },
      );
      const artifacts = [makeTestSuiteArtifact("test/MyTest.sol", "MyTest")];
      await assertRejectsWithHardhatError(
        async () => getTestFunctionOverrides(artifacts, [bi]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS
          .INLINE_CONFIG_UNRESOLVED_SELECTOR,
        {
          functionFqn: getFunctionFqn(
            "test/MyTest.sol",
            "MyTest",
            "testHelper",
          ),
        },
      );
    });

    it("should process a basic end-to-end case", async () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 50",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation: " hardhat-config: fuzz.runs = 50",
              },
            ],
          },
        },
      );
      const artifacts = [makeTestSuiteArtifact("test/MyTest.sol", "MyTest")];
      const overrides = await getTestFunctionOverrides(artifacts, [bi]);
      assert.equal(overrides.length, 1);
      assert.equal(overrides[0].identifier.functionSelector, "0xaabbccdd");
      assert.deepEqual(overrides[0].config, { fuzz: { runs: 50 } });
    });

    it("should merge overrides from mixed hardhat-config: and forge-config: prefixes", async () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10\n/// forge-config: fuzz.max-test-rejects = 500",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation:
                  " hardhat-config: fuzz.runs = 10\n forge-config: fuzz.max-test-rejects = 500",
              },
            ],
          },
        },
      );
      const artifacts = [makeTestSuiteArtifact("test/MyTest.sol", "MyTest")];
      const overrides = await getTestFunctionOverrides(artifacts, [bi]);
      assert.equal(overrides.length, 1);
      assert.deepEqual(overrides[0].config, {
        fuzz: { runs: 10, maxTestRejects: 500 },
      });
    });

    it("should throw BUILD_INFO_NOT_FOUND when artifact references missing build info", async () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
        },
        "0.8.23",
        "other-build-info-id",
      );

      const artifacts = [makeTestSuiteArtifact("test/MyTest.sol", "MyTest")];
      await assertRejectsWithHardhatError(
        async () => getTestFunctionOverrides(artifacts, [bi]),
        HardhatError.ERRORS.CORE.SOLIDITY_TESTS
          .BUILD_INFO_NOT_FOUND_FOR_CONTRACT,
        {
          fqn: "test/MyTest.sol:MyTest",
        },
      );
    });

    it("should produce separate overrides for overloaded functions", async () => {
      const bi = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10\n/// hardhat-config: fuzz.runs = 20",
        {
          MyTest: {
            methodIdentifiers: {
              "testFuzz()": "aabbccdd",
              "testFuzz(uint256)": "11223344",
            },
            functions: [
              {
                name: "testFuzz",
                functionSelector: "aabbccdd",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
              {
                name: "testFuzz",
                functionSelector: "11223344",
                documentation: " hardhat-config: fuzz.runs = 20",
              },
            ],
          },
        },
      );
      const artifacts = [makeTestSuiteArtifact("test/MyTest.sol", "MyTest")];
      const result = await getTestFunctionOverrides(artifacts, [bi]);
      assert.equal(result.length, 2);

      const selectors = result.map((r) => r.identifier.functionSelector).sort();
      assert.deepEqual(selectors, ["0x11223344", "0xaabbccdd"]);

      const bySelector = new Map(
        result.map((r) => [r.identifier.functionSelector, r.config]),
      );
      assert.deepEqual(bySelector.get("0xaabbccdd"), { fuzz: { runs: 10 } });
      assert.deepEqual(bySelector.get("0x11223344"), { fuzz: { runs: 20 } });
    });

    it("should not duplicate overrides when same source is a root in multiple build infos", async () => {
      const bi1 = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
        },
        "0.8.23",
        "bi-1",
      );
      const bi2 = makeBuildInfo(
        "test/MyTest.sol",
        "/// hardhat-config: fuzz.runs = 10",
        {
          MyTest: {
            methodIdentifiers: { "testFuzz()": "aabbccdd" },
            functions: [
              {
                name: "testFuzz",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
        },
        "0.8.23",
        "bi-2",
      );
      // Artifact only points to bi-1
      const artifacts = [
        makeTestSuiteArtifact("test/MyTest.sol", "MyTest", "0.8.23", "bi-1"),
      ];
      const overrides = await getTestFunctionOverrides(artifacts, [bi1, bi2]);
      assert.equal(overrides.length, 1);
      assert.deepEqual(overrides[0].config, { fuzz: { runs: 10 } });
    });

    it("should handle multiple contracts in a single source file", async () => {
      const bi = makeBuildInfo(
        "test/Multi.sol",
        "/// hardhat-config: fuzz.runs = 10\n/// hardhat-config: fuzz.runs = 20",
        {
          ContractA: {
            methodIdentifiers: { "testA()": "aaaaaaaa" },
            functions: [
              {
                name: "testA",
                documentation: " hardhat-config: fuzz.runs = 10",
              },
            ],
          },
          ContractB: {
            methodIdentifiers: { "testB()": "bbbbbbbb" },
            functions: [
              {
                name: "testB",
                documentation: " hardhat-config: fuzz.runs = 20",
              },
            ],
          },
        },
      );
      const artifacts = [
        makeTestSuiteArtifact("test/Multi.sol", "ContractA"),
        makeTestSuiteArtifact("test/Multi.sol", "ContractB"),
      ];
      const result = await getTestFunctionOverrides(artifacts, [bi]);
      assert.equal(result.length, 2);

      const bySelector = new Map(
        result.map((r) => [r.identifier.functionSelector, r]),
      );
      const overrideA = bySelector.get("0xaaaaaaaa");
      assert.ok(
        overrideA !== undefined,
        "Override for ContractA should be found",
      );
      assert.deepEqual(overrideA.config, { fuzz: { runs: 10 } });
      assert.deepEqual(overrideA.identifier.contractArtifact, {
        name: "ContractA",
        source: "test/Multi.sol",
        solcVersion: "0.8.23",
      });

      const overrideB = bySelector.get("0xbbbbbbbb");
      assert.ok(
        overrideB !== undefined,
        "Override for ContractB should be found",
      );
      assert.deepEqual(overrideB.config, { fuzz: { runs: 20 } });
      assert.deepEqual(overrideB.identifier.contractArtifact, {
        name: "ContractB",
        source: "test/Multi.sol",
        solcVersion: "0.8.23",
      });
    });
  });
});
