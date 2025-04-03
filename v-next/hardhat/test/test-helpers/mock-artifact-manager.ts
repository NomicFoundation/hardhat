import type {
  ArtifactManager,
  Artifact,
  GetArtifactByName,
} from "../../src/types/artifacts.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";

export class MockArtifactManager implements ArtifactManager {
  readonly #artifacts: Map<string, Artifact>;

  constructor() {
    this.#artifacts = new Map();
  }

  public async saveArtifact(artifact: Artifact): Promise<void> {
    this.#artifacts.set(artifact.contractName, artifact);
  }

  public async readArtifact<ContractNameT extends string>(
    contractNameOrFullyQualifiedName: ContractNameT,
  ): Promise<GetArtifactByName<ContractNameT>> {
    const artifact = this.#artifacts.get(contractNameOrFullyQualifiedName);

    assertHardhatInvariant(
      artifact !== undefined,
      "Unable to find the artifact during mock readArtifact " +
        contractNameOrFullyQualifiedName,
    );

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We are asserting that the artifact is of the correct type, which won't be
    really used during tests. */
    return artifact as GetArtifactByName<ContractNameT>;
  }

  public async getArtifactPath(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<string> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactManager",
    });
  }

  public async artifactExists(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<boolean> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactManager",
    });
  }

  public async getAllFullyQualifiedNames(): Promise<ReadonlySet<string>> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactManager",
    });
  }

  public async getBuildInfoId(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<string | undefined> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactManager",
    });
  }

  public async getAllBuildInfoIds(): Promise<ReadonlySet<string>> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactManager",
    });
  }

  public async getBuildInfoPath(
    _buildInfoId: string,
  ): Promise<string | undefined> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactManager",
    });
  }

  public async getBuildInfoOutputPath(
    _buildInfoId: string,
  ): Promise<string | undefined> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactManager",
    });
  }

  public async clearCache(): Promise<void> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactManager",
    });
  }
}
