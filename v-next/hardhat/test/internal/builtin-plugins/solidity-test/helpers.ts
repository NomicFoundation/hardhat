import type { Artifact } from "@ignored/edr";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isTestArtifact } from "../../../../src/internal/builtin-plugins/solidity-test/helpers.js";

const testCases = [
  {
    contract: "Abstract",
    expected: false,
  },
  {
    contract: "NoTest",
    expected: false,
  },
  {
    contract: "PublicTest",
    expected: true,
  },
  {
    contract: "ExternalTest",
    expected: true,
  },
  {
    contract: "PrivateTest",
    expected: false,
  },
  {
    contract: "InternalTest",
    expected: false,
  },
  {
    contract: "PublicInvariant",
    expected: true,
  },
  {
    contract: "ExternalInvariant",
    expected: true,
  },
  {
    contract: "PrivateInvariant",
    expected: false,
  },
  {
    contract: "InternalInvariant",
    expected: false,
  },
];

describe("isTestArtifact", () => {
  for (const { contract, expected } of testCases) {
    it(`should return ${expected} for the ${contract} contract`, async () => {
      const artifact: Artifact = {
        id: {
          name: contract,
          source: `test-fixtures/Test.t.sol`,
          solcVersion: "0.8.20",
        },
        contract: {
          abi: "",
        },
      };
      const actual = await isTestArtifact(import.meta.dirname, artifact);
      assert.equal(actual, expected);
    });
  }

  it("should return false if a file does not exist", async () => {
    const artifact: Artifact = {
      id: {
        name: "Contract",
        source: `test-fixtures/NonExistent.t.sol`,
        solcVersion: "0.8.20",
      },
      contract: {
        abi: "",
      },
    };
    const actual = await isTestArtifact(import.meta.dirname, artifact);
    assert.equal(actual, false);
  });

  it("should return false if the file has the wrong extension", async () => {
    const artifact: Artifact = {
      id: {
        name: "Contract",
        source: `test-fixtures/WrongExtension.sol`,
        solcVersion: "0.8.20",
      },
      contract: {
        abi: "",
      },
    };
    const actual = await isTestArtifact(import.meta.dirname, artifact);
    assert.equal(actual, false);
  });
});
