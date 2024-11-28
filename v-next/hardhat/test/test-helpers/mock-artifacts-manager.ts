import type {
  ArtifactsManager,
  Artifact,
  BuildInfo,
  GetAtifactByName,
} from "../../src/types/artifacts.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";

export class MockArtifactsManager implements ArtifactsManager {
  readonly #artifacts: Readonly<Map<string, Readonly<Artifact>>>;

  constructor() {
    this.#artifacts = new Map();
  }

  public async readArtifact<ContractNameT extends string>(
    contractNameOrFullyQualifiedName: ContractNameT,
  ): Promise<GetAtifactByName<ContractNameT>> {
    const artifact = this.#artifacts.get(contractNameOrFullyQualifiedName);

    assertHardhatInvariant(
      artifact !== undefined,
      "Unable to find the artifact during mock readArtifact " +
        contractNameOrFullyQualifiedName,
    );

    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
    We are asserting that the artifact is of the correct type, which won't be
    really used during tests. */
    return artifact as GetAtifactByName<ContractNameT>;
  }

  public artifactExists(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<boolean> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getAllFullyQualifiedNames(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getBuildInfo(
    _fullyQualifiedName: string,
  ): Promise<BuildInfo | undefined> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getArtifactPaths(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getDebugFilePaths(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getBuildInfoPaths(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public async saveArtifact(artifact: Artifact): Promise<void> {
    this.#artifacts.set(artifact.contractName, artifact);
  }

  public formArtifactPathFromFullyQualifiedName(
    _fullyQualifiedName: string,
  ): string {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }

  public getArtifactPath(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<string> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
  }
}
