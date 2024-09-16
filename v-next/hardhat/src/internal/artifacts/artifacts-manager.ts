import type {
  Artifact,
  ArtifactsManager,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
} from "../../types/artifacts.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

export class ArtifactsManagerImplementation implements ArtifactsManager {
  public readArtifact(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<Artifact> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public artifactExists(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<boolean> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public getAllFullyQualifiedNames(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public getBuildInfo(
    _fullyQualifiedName: string,
  ): Promise<BuildInfo | undefined> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public getArtifactPaths(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public getBuildInfoPaths(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public saveArtifact(_artifact: Artifact): Promise<void> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public saveBuildInfo(
    _solcVersion: string,
    _solcLongVersion: string,
    _input: CompilerInput,
    _output: CompilerOutput,
  ): Promise<string> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public getArtifactPath(_fullyQualifiedName: string): Promise<string> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }
}
