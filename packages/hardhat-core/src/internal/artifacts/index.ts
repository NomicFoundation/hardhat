import {
  Artifact,
  Artifacts as IArtifacts,
  ArtifactSource,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
} from "../../types";

import { ARTIFACT_FORMAT_VERSION } from "../constants";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";

import { CachingSource } from "./caching";

export class Artifacts implements IArtifacts {
  private readonly _hardhatSource: CachingSource;
  constructor(
    artifactsPath: string,
    private readonly _extensionSources: ArtifactSource[] = []
  ) {
    this._hardhatSource = new CachingSource(artifactsPath);
  }

  public async readArtifact(
    contractNameOrFullyQualifiedName: string
  ): Promise<Artifact> {
    let artifact;

    let hardhatError; // hold unless/until extensions yield nothing
    try {
      artifact = await this._hardhatSource.readArtifact(
        contractNameOrFullyQualifiedName
      );
    } catch (error) {
      if (error instanceof HardhatError) {
        hardhatError = error;
      }
    }

    if (
      artifact === undefined ||
      hardhatError?.number === ERRORS.ARTIFACTS.NOT_FOUND.number
    ) {
      const artifacts: Array<Artifact | undefined> = await Promise.all(
        this._extensionSources.map((source) =>
          source.readArtifact(contractNameOrFullyQualifiedName)
        )
      );
      artifact = artifacts.find((_artifact) => _artifact !== undefined);
    }

    if (artifact === undefined) {
      if (hardhatError !== undefined) {
        throw hardhatError;
      }
      throw new HardhatError(ERRORS.ARTIFACTS.NOT_FOUND, {
        contractName: contractNameOrFullyQualifiedName,
        suggestion: "",
      });
    }

    return artifact;
  }

  public readArtifactSync(contractNameOrFullyQualifiedName: string): Artifact {
    let artifact;

    let hardhatError; // hold unless/until extensions yield nothing
    try {
      artifact = this._hardhatSource.readArtifactSync(
        contractNameOrFullyQualifiedName
      );
    } catch (error) {
      if (error instanceof HardhatError) {
        hardhatError = error;
      }
    }

    if (
      artifact === undefined ||
      hardhatError?.number === ERRORS.ARTIFACTS.NOT_FOUND.number
    ) {
      for (const source of this._extensionSources) {
        artifact = source.readArtifactSync(contractNameOrFullyQualifiedName);
        if (artifact !== undefined) {
          break;
        }
      }
    }

    if (artifact === undefined) {
      if (hardhatError !== undefined) {
        throw hardhatError;
      } else {
        throw new HardhatError(ERRORS.ARTIFACTS.NOT_FOUND, {
          contractName: contractNameOrFullyQualifiedName,
          suggestion: "",
        });
      }
    }

    return artifact;
  }

  public async artifactExists(
    contractNameOrFullyQualifiedName: string
  ): Promise<boolean> {
    const existencesPerSource = await Promise.all(
      [this._hardhatSource, ...this._extensionSources].map((source) =>
        source.artifactExists(contractNameOrFullyQualifiedName)
      )
    );
    return existencesPerSource.includes(true);
  }

  public async getAllFullyQualifiedNames(): Promise<string[]> {
    return (
      await Promise.all(
        [this._hardhatSource, ...this._extensionSources].map((s) =>
          s.getAllFullyQualifiedNames()
        )
      )
    ).flat();
  }

  public async getBuildInfo(
    fullyQualifiedName: string
  ): Promise<BuildInfo | undefined> {
    let buildInfo;

    let hardhatError; // hold unless/until extensions yield nothing
    try {
      buildInfo = await this._hardhatSource.getBuildInfo(fullyQualifiedName);
    } catch (error) {
      if (error instanceof HardhatError) {
        hardhatError = error;
      }
    }

    if (
      buildInfo === undefined ||
      hardhatError?.number === ERRORS.ARTIFACTS.NOT_FOUND.number
    ) {
      const buildInfos: Array<BuildInfo | undefined> = await Promise.all(
        this._extensionSources.map((source) =>
          source.getBuildInfo(fullyQualifiedName)
        )
      );
      buildInfo = buildInfos.find((info) => info !== undefined);
    }

    if (buildInfo === undefined) {
      if (hardhatError !== undefined) {
        throw hardhatError;
      }
    }

    return buildInfo;
  }

  public async getArtifactPaths(): Promise<string[]> {
    return (
      await Promise.all(
        [this._hardhatSource, ...this._extensionSources].map((s) =>
          s.getArtifactPaths()
        )
      )
    ).flat();
  }

  public async getDebugFilePaths(): Promise<string[]> {
    return (
      await Promise.all(
        [this._hardhatSource, ...this._extensionSources].map((s) =>
          s.getDebugFilePaths()
        )
      )
    ).flat();
  }

  public async getBuildInfoPaths(): Promise<string[]> {
    return (
      await Promise.all(
        [this._hardhatSource, ...this._extensionSources].map((s) =>
          s.getBuildInfoPaths()
        )
      )
    ).flat();
  }

  public clearCache(): void {
    for (const source of [this._hardhatSource, ...this._extensionSources]) {
      source.clearCache();
    }
  }

  public disableCache(): void {
    for (const source of [this._hardhatSource, ...this._extensionSources]) {
      source.disableCache();
    }
  }

  public saveArtifactAndDebugFile(
    artifact: Artifact,
    pathToBuildInfo?: string
  ): Promise<void> {
    return this._hardhatSource.saveArtifactAndDebugFile(
      artifact,
      pathToBuildInfo
    );
  }

  public saveBuildInfo(
    solcVersion: string,
    solcLongVersion: string,
    input: CompilerInput,
    output: CompilerOutput
  ): Promise<string> {
    return this._hardhatSource.saveBuildInfo(
      solcVersion,
      solcLongVersion,
      input,
      output
    );
  }

  public formArtifactPathFromFullyQualifiedName(
    fullyQualifiedName: string
  ): string {
    return this._hardhatSource.formArtifactPathFromFullyQualifiedName(
      fullyQualifiedName
    );
  }

  public addValidArtifacts(
    validArtifacts: Array<{ sourceName: string; artifacts: string[] }>
  ) {
    this._hardhatSource.addValidArtifacts(validArtifacts);
  }

  public async removeObsoleteArtifacts() {
    return this._hardhatSource.removeObsoleteArtifacts();
  }
}

/**
 * Retrieves an artifact for the given `contractName` from the compilation output.
 *
 * @param sourceName The contract's source name.
 * @param contractName the contract's name.
 * @param contractOutput the contract's compilation output as emitted by `solc`.
 */
export function getArtifactFromContractOutput(
  sourceName: string,
  contractName: string,
  contractOutput: any
): Artifact {
  const evmBytecode = contractOutput.evm && contractOutput.evm.bytecode;
  let bytecode: string =
    evmBytecode && evmBytecode.object ? evmBytecode.object : "";

  if (bytecode.slice(0, 2).toLowerCase() !== "0x") {
    bytecode = `0x${bytecode}`;
  }

  const evmDeployedBytecode =
    contractOutput.evm && contractOutput.evm.deployedBytecode;
  let deployedBytecode: string =
    evmDeployedBytecode && evmDeployedBytecode.object
      ? evmDeployedBytecode.object
      : "";

  if (deployedBytecode.slice(0, 2).toLowerCase() !== "0x") {
    deployedBytecode = `0x${deployedBytecode}`;
  }

  const linkReferences =
    evmBytecode && evmBytecode.linkReferences ? evmBytecode.linkReferences : {};
  const deployedLinkReferences =
    evmDeployedBytecode && evmDeployedBytecode.linkReferences
      ? evmDeployedBytecode.linkReferences
      : {};

  return {
    _format: ARTIFACT_FORMAT_VERSION,
    contractName,
    sourceName,
    abi: contractOutput.abi,
    bytecode,
    deployedBytecode,
    linkReferences,
    deployedLinkReferences,
  };
}
