import type {
  ArtifactsManager,
  Artifact,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
} from "../../src/types/artifacts.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";

export class MockArtifactsManager implements ArtifactsManager {
  readonly #artifacts: Map<string, Artifact>;

  constructor() {
    this.#artifacts = new Map();
  }

  public async readArtifact(
    contractNameOrFullyQualifiedName: string,
  ): Promise<Artifact> {
    const artifact = this.#artifacts.get(contractNameOrFullyQualifiedName);

    assertHardhatInvariant(
      artifact !== undefined,
      "Unable to find the artifact during mock readArtifact " +
        contractNameOrFullyQualifiedName,
    );

    return artifact;
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

  public saveBuildInfo(
    _solcVersion: string,
    _solcLongVersion: string,
    _input: CompilerInput,
    _output: CompilerOutput,
  ): Promise<string> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in MockArtifactsManager",
    });
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
