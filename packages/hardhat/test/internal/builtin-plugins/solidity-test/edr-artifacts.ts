import type {
  BuildInfoAndOutput,
  EdrArtifactWithMetadata,
} from "../../../../src/internal/builtin-plugins/solidity-test/edr-artifacts.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import {
  BUILD_INFO_FORMAT,
  buildEdrArtifactsWithMetadataFromBuildInfos,
  mergeCompiledContracts,
} from "../../../../src/internal/builtin-plugins/solidity-test/edr-artifacts.js";

describe("BUILD_INFO_FORMAT", () => {
  it("matches a standard build ID", () => {
    const match = BUILD_INFO_FORMAT.exec("solc-0_8_0-abc123");

    assert.ok(
      match !== null && match.groups !== undefined,
      "Regexp should match and have groups",
    );

    assert.equal(match.groups.major, "0");
    assert.equal(match.groups.minor, "8");
    assert.equal(match.groups.patch, "0");
    assert.equal(match.groups.compilerType, undefined);
  });

  it("matches a build ID with compiler type", () => {
    const match = BUILD_INFO_FORMAT.exec("solc-0_8_0-solx-abc123");

    assert.ok(
      match !== null && match.groups !== undefined,
      "Regexp should match and have groups",
    );

    assert.equal(match.groups.compilerType, "solx");
  });

  it("matches a build ID with a hyphenated compiler type", () => {
    const match = BUILD_INFO_FORMAT.exec("solc-0_8_0-slang-solx-abc123");

    assert.ok(
      match !== null && match.groups !== undefined,
      "Regexp should match and have groups",
    );

    assert.equal(match.groups.compilerType, "slang-solx");
  });

  it("matches a build ID with empty hash", () => {
    // The regex allows zero hex chars in the hash portion
    const match = BUILD_INFO_FORMAT.exec("solc-0_8_0-");
    assert.notEqual(match, null);
  });

  it("does not match a build ID without solc prefix", () => {
    const match = BUILD_INFO_FORMAT.exec("solx-0_8_0-abc123");
    assert.equal(match, null);
  });

  it("does not match a build ID with dots in version", () => {
    const match = BUILD_INFO_FORMAT.exec("solc-0.8.0-abc123");
    assert.equal(match, null);
  });
});

describe("buildEdrArtifactsWithMetadataFromBuildInfos", () => {
  const buildInfoId = "solc-0_8_28-abc123";

  function getBuildInfoAndOutput(
    id: string,
    contracts: Record<string, string[]>,
  ): BuildInfoAndOutput {
    const output = {
      _format: "hh3-sol-build-info-output-1",
      id,
      output: {
        contracts: Object.fromEntries(
          Object.entries(contracts).map(([source, names]) => [
            source,
            Object.fromEntries(
              names.map((name) => [
                name,
                {
                  abi: [],
                  evm: {
                    bytecode: { object: "6001" },
                    deployedBytecode: { object: "6002" },
                  },
                },
              ]),
            ),
          ]),
        ),
      },
    };

    return {
      buildInfoId: id,
      buildInfo: new Uint8Array(),
      output: new TextEncoder().encode(JSON.stringify(output)),
    };
  }

  function getExistingArtifact(
    id: string,
    source: string,
    name: string,
  ): EdrArtifactWithMetadata {
    return {
      edrArtifact: {
        id: { name, solcVersion: "0.8.28", source },
        contract: { abi: "[]" },
      },
      userSourceName: source,
      buildInfoId: id,
    };
  }

  it("returns the compiled contracts that have no artifact", async () => {
    const result = await buildEdrArtifactsWithMetadataFromBuildInfos(
      [
        getBuildInfoAndOutput(buildInfoId, {
          "project/contracts/Counter.sol": ["Counter"],
        }),
      ],
      [],
    );

    assert.deepEqual(result, [
      {
        edrArtifact: {
          id: {
            name: "Counter",
            solcVersion: "0.8.28",
            source: "project/contracts/Counter.sol",
          },
          contract: {
            abi: "[]",
            bytecode: "0x6001",
            linkReferences: {},
            deployedBytecode: "0x6002",
            deployedLinkReferences: {},
          },
        },
        userSourceName: "contracts/Counter.sol",
        buildInfoId,
      },
    ]);
  });

  it("doesn't return contracts from npm packages", async () => {
    const result = await buildEdrArtifactsWithMetadataFromBuildInfos(
      [
        getBuildInfoAndOutput(buildInfoId, {
          "project/contracts/Counter.sol": ["Counter"],
          "npm/@openzeppelin/contracts@5.0.0/access/Ownable.sol": ["Ownable"],
        }),
      ],
      [],
    );

    assert.deepEqual(
      result.map(({ edrArtifact }) => edrArtifact.id.source),
      ["project/contracts/Counter.sol"],
    );
  });

  it("skips the contracts that have an artifact from the same build info only", async () => {
    const result = await buildEdrArtifactsWithMetadataFromBuildInfos(
      [
        getBuildInfoAndOutput(buildInfoId, {
          "project/test/Counter.t.sol": ["CounterTest"],
          "project/contracts/Counter.sol": ["Counter"],
        }),
      ],
      [
        getExistingArtifact(
          buildInfoId,
          "project/test/Counter.t.sol",
          "CounterTest",
        ),
        // An artifact from an older build doesn't describe what this build
        // compiled.
        getExistingArtifact(
          "solc-0_8_28-def456",
          "project/contracts/Counter.sol",
          "Counter",
        ),
      ],
    );

    assert.deepEqual(
      result.map(({ edrArtifact }) => edrArtifact.id.name),
      ["Counter"],
    );
  });

  it("ignores build infos that weren't generated by Hardhat", async () => {
    const result = await buildEdrArtifactsWithMetadataFromBuildInfos(
      [
        getBuildInfoAndOutput("not-hardhat", {
          "project/contracts/Counter.sol": ["Counter"],
        }),
      ],
      [],
    );

    assert.deepEqual(result, []);
  });

  it("throws if a build info output can't be parsed", async () => {
    await assertRejectsWithHardhatError(
      buildEdrArtifactsWithMetadataFromBuildInfos(
        [
          {
            buildInfoId,
            buildInfo: new Uint8Array(),
            output: new TextEncoder().encode("{"),
          },
        ],
        [],
      ),
      HardhatError.ERRORS.CORE.SOLIDITY.BUILD_INFO_OUTPUT_PARSE_ERROR,
      { buildInfoId },
    );
  });
});

describe("mergeCompiledContracts", () => {
  function getArtifact(
    buildInfoId: string,
    name: string,
  ): EdrArtifactWithMetadata {
    return {
      edrArtifact: {
        id: {
          name,
          solcVersion: "0.8.28",
          source: `project/contracts/${name}.sol`,
        },
        contract: { abi: "[]" },
      },
      userSourceName: `contracts/${name}.sol`,
      buildInfoId,
    };
  }

  it("replaces an artifact with a compiled contract with the same id", () => {
    const stale = getArtifact("solc-0_8_28-old", "Counter");
    const other = getArtifact("solc-0_8_28-old", "Other");
    const compiled = getArtifact("solc-0_8_28-new", "Counter");

    assert.deepEqual(
      mergeCompiledContracts(
        [stale, other],
        [compiled],
        new Set(["solc-0_8_28-new"]),
      ),
      [other, compiled],
    );
  });

  it("never replaces an artifact from a selected build info", () => {
    // ATest has an artifact from build info a, and build info b, also
    // selected, compiled it again (e.g. with other settings).
    const emitted = getArtifact("solc-0_8_28-a", "ATest");
    const compiledAgain = getArtifact("solc-0_8_28-b", "ATest");

    assert.deepEqual(
      mergeCompiledContracts(
        [emitted],
        [compiledAgain],
        new Set(["solc-0_8_28-a", "solc-0_8_28-b"]),
      ),
      [emitted],
    );
  });

  it("adds a contract compiled in several build infos once", () => {
    const fromA = getArtifact("solc-0_8_28-a", "Counter");
    const fromB = getArtifact("solc-0_8_28-b", "Counter");

    assert.deepEqual(
      mergeCompiledContracts(
        [],
        [fromA, fromB],
        new Set(["solc-0_8_28-a", "solc-0_8_28-b"]),
      ),
      [fromA],
    );
  });
});
