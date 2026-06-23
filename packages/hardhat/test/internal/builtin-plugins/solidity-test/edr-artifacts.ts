import type {
  Artifact,
  ArtifactManager,
} from "../../../../src/types/artifacts.js";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BUILD_INFO_FORMAT,
  buildEdrArtifactsWithMetadata,
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

describe("buildEdrArtifactsWithMetadata", () => {
  it("adds a placeholder for missing console library artifacts", async () => {
    const testArtifact = createArtifact({
      contractName: "ConsoleAddrTest",
      sourceName: "test/ConsoleAddr.t.sol",
      inputSourceName: "project/test/ConsoleAddr.t.sol",
      linkReferences: {
        "project/lib/forge-std/src/console.sol": {
          console: [{ start: 25, length: 20 }],
        },
      },
    });

    const artifactManager = new StaticArtifactManager([testArtifact]);
    const edrArtifacts = await buildEdrArtifactsWithMetadata(artifactManager);

    assert.deepEqual(
      edrArtifacts.map(({ edrArtifact }) => edrArtifact.id),
      [
        {
          name: "ConsoleAddrTest",
          source: "project/test/ConsoleAddr.t.sol",
          solcVersion: "0.8.25",
        },
        {
          name: "console",
          source: "project/lib/forge-std/src/console.sol",
          solcVersion: "0.8.25",
        },
      ],
    );
    assert.equal(
      edrArtifacts[1].edrArtifact.contract.bytecode,
      "0x000000000000000000636f6e736f6c652e6c6f67",
    );
  });

  it("doesn't add duplicate console library artifacts", async () => {
    const consoleArtifact = createArtifact({
      contractName: "console",
      sourceName: "lib/forge-std/src/console.sol",
      inputSourceName: "project/lib/forge-std/src/console.sol",
    });
    const testArtifact = createArtifact({
      contractName: "ConsoleAddrTest",
      sourceName: "test/ConsoleAddr.t.sol",
      inputSourceName: "project/test/ConsoleAddr.t.sol",
      linkReferences: {
        "project/lib/forge-std/src/console.sol": {
          console: [{ start: 25, length: 20 }],
        },
      },
    });

    const artifactManager = new StaticArtifactManager([
      consoleArtifact,
      testArtifact,
    ]);
    const edrArtifacts = await buildEdrArtifactsWithMetadata(artifactManager);

    assert.equal(
      edrArtifacts.filter(
        ({ edrArtifact }) => edrArtifact.id.name === "console",
      ).length,
      1,
    );
  });
});

function createArtifact(overrides: Partial<Artifact>): Artifact {
  return {
    _format: "hh3-artifact-1",
    contractName: "Counter",
    sourceName: "contracts/Counter.sol",
    abi: [],
    bytecode: "0x00",
    linkReferences: {},
    deployedBytecode: "0x00",
    deployedLinkReferences: {},
    buildInfoId: "solc-0_8_25-abcdef",
    inputSourceName: "project/contracts/Counter.sol",
    ...overrides,
  };
}

class StaticArtifactManager implements ArtifactManager {
  readonly #artifactsByFullyQualifiedName: Map<string, Artifact>;

  constructor(artifacts: Artifact[]) {
    this.#artifactsByFullyQualifiedName = new Map(
      artifacts.map((artifact) => [
        `${artifact.sourceName}:${artifact.contractName}`,
        artifact,
      ]),
    );
  }

  public async getAllFullyQualifiedNames(): Promise<ReadonlySet<string>> {
    return new Set(this.#artifactsByFullyQualifiedName.keys());
  }

  public async readArtifact(
    contractNameOrFullyQualifiedName: string,
  ): Promise<any> {
    const artifact = this.#artifactsByFullyQualifiedName.get(
      contractNameOrFullyQualifiedName,
    );
    assert.ok(
      artifact !== undefined,
      `Missing mock artifact ${contractNameOrFullyQualifiedName}`,
    );
    return artifact;
  }

  public async getArtifactPath(): Promise<string> {
    assert.fail("Not implemented in StaticArtifactManager");
  }

  public async artifactExists(): Promise<boolean> {
    assert.fail("Not implemented in StaticArtifactManager");
  }

  public async getAllArtifactPaths(): Promise<ReadonlySet<string>> {
    assert.fail("Not implemented in StaticArtifactManager");
  }

  public async getBuildInfoId(): Promise<string | undefined> {
    assert.fail("Not implemented in StaticArtifactManager");
  }

  public async getAllBuildInfoIds(): Promise<ReadonlySet<string>> {
    assert.fail("Not implemented in StaticArtifactManager");
  }

  public async getBuildInfoPath(): Promise<string | undefined> {
    assert.fail("Not implemented in StaticArtifactManager");
  }

  public async getBuildInfoOutputPath(): Promise<string | undefined> {
    assert.fail("Not implemented in StaticArtifactManager");
  }

  public async clearCache(): Promise<void> {
    assert.fail("Not implemented in StaticArtifactManager");
  }
}
