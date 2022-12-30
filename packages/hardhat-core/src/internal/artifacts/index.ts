import * as os from "os";
import path from "path";

import {
  Artifact,
  Artifacts as IArtifacts,
  ArtifactsSource,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
} from "../../types";
import { parseFullyQualifiedName } from "../../utils/contract-names";

import { ARTIFACT_FORMAT_VERSION } from "../constants";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";

import { CachingSource } from "./caching";

export class Artifacts implements IArtifacts {
  private readonly _hardhatSource: CachingSource;

  constructor(
    private readonly _artifactsPath: string,
    private readonly _extensionSources: ArtifactsSource[] = []
  ) {
    this._hardhatSource = new CachingSource(this._artifactsPath);
  }

  public async readArtifact(
    contractNameOrFullyQualifiedName: string
  ): Promise<Artifact> {
    let artifact: Artifact | undefined = await this._hardhatSource.readArtifact(
      contractNameOrFullyQualifiedName
    );

    if (artifact === undefined) {
      const artifacts: Array<Artifact | undefined> = await Promise.all(
        this._extensionSources.map((source) =>
          source.readArtifact(contractNameOrFullyQualifiedName)
        )
      );

      artifact = artifacts.find((_artifact) => _artifact !== undefined);
    }

    if (artifact === undefined) {
      this._throwNotFound(contractNameOrFullyQualifiedName);
    }

    return artifact;
  }

  public readArtifactSync(contractNameOrFullyQualifiedName: string): Artifact {
    let artifact: Artifact | undefined = this._hardhatSource.readArtifactSync(
      contractNameOrFullyQualifiedName
    );

    if (artifact === undefined) {
      for (const source of this._extensionSources) {
        artifact = source.readArtifactSync(contractNameOrFullyQualifiedName);
        if (artifact !== undefined) {
          break;
        }
      }
    }

    if (artifact === undefined) {
      this._throwNotFound(contractNameOrFullyQualifiedName);
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
    let buildInfo = await this._hardhatSource.getBuildInfo(fullyQualifiedName);

    if (buildInfo === undefined) {
      const buildInfos: Array<BuildInfo | undefined> = await Promise.all(
        this._extensionSources.map((source) =>
          source.getBuildInfo(fullyQualifiedName)
        )
      );
      buildInfo = buildInfos.find((info) => info !== undefined);
    }

    return buildInfo;
  }

  public getBuildInfoSync(fullyQualifiedName: string): BuildInfo | undefined {
    let buildInfo = this._hardhatSource.getBuildInfoSync(fullyQualifiedName);

    if (buildInfo === undefined) {
      const buildInfos: Array<BuildInfo | undefined> =
        this._extensionSources.map((source) =>
          source.getBuildInfoSync(fullyQualifiedName)
        );

      buildInfo = buildInfos.find((info) => info !== undefined);
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

  private _throwNotFound(contractNameOrFullyQualifiedName: string): never {
    const suggestions = this._hardhatSource.getSuggestions(
      contractNameOrFullyQualifiedName
    );

    const uniqueSuggestions = [...new Set(suggestions)].sort();

    const suggestion = this._formatSuggestions(
      uniqueSuggestions,
      contractNameOrFullyQualifiedName
    );

    throw new HardhatError(ERRORS.ARTIFACTS.NOT_FOUND, {
      contractName: contractNameOrFullyQualifiedName,
      suggestion,
    });
  }

  private _formatSuggestions(names: string[], contractName: string): string {
    switch (names.length) {
      case 0:
        return "";
      case 1:
        return `Did you mean "${names[0]}"?`;
      default:
        return `We found some that were similar:

${names.map((n) => `  * ${n}`).join(os.EOL)}

Please replace "${contractName}" for the correct contract name wherever you are trying to read its artifact.
`;
    }
  }

  /**
   * DO NOT DELETE OR CHANGE
   *
   * use this.formArtifactPathFromFullyQualifiedName instead
   * @deprecated until typechain migrates to public version
   * @see https://github.com/dethcrypto/TypeChain/issues/544
   */
  private _getArtifactPathFromFullyQualifiedName(
    fullyQualifiedName: string
  ): string {
    const { sourceName, contractName } =
      parseFullyQualifiedName(fullyQualifiedName);

    return path.join(this._artifactsPath, sourceName, `${contractName}.json`);
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
  const evmBytecode = contractOutput.evm?.bytecode;
  let bytecode: string = evmBytecode?.object ?? "";

  if (bytecode.slice(0, 2).toLowerCase() !== "0x") {
    bytecode = `0x${bytecode}`;
  }

  const evmDeployedBytecode = contractOutput.evm?.deployedBytecode;
  let deployedBytecode: string = evmDeployedBytecode?.object ?? "";

  if (deployedBytecode.slice(0, 2).toLowerCase() !== "0x") {
    deployedBytecode = `0x${deployedBytecode}`;
  }

  const linkReferences = evmBytecode?.linkReferences ?? {};
  const deployedLinkReferences = evmDeployedBytecode?.linkReferences ?? {};

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
