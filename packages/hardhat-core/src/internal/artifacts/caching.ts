import {
  Artifact,
  ArtifactsSource,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
} from "../../types";

import { MutableSource } from "./mutable";

interface Cache {
  artifactPaths?: string[];
  debugFilePaths?: string[];
  buildInfoPaths?: string[];
  artifactNameToArtifactPathCache: Map<string, string>;
  artifactFQNToBuildInfoPathCache: Map<string, string>;
  artifactNameToArtifact: Map<string, Artifact>;
}

export class CachingSource extends MutableSource implements ArtifactsSource {
  // Undefined means that the cache is disabled.
  private _cache?: Cache = {
    artifactNameToArtifactPathCache: new Map(),
    artifactFQNToBuildInfoPathCache: new Map(),
    artifactNameToArtifact: new Map(),
  };

  constructor(artifactsPath: string) {
    super(artifactsPath);
  }

  public artifactExists(
    contractNameOrFullyQualifiedName: string
  ): Promise<boolean> {
    // Cached internally because `ReadOnlyByPath#artifactExists` calls
    // `this._readArtifactByPath`, which invokes `CachingSource#_readArtifactByPath`.
    return super.artifactExists(contractNameOrFullyQualifiedName);
  }
  public getAllFullyQualifiedNames(): Promise<string[]> {
    // Cached internally because `ReadOnlySource#getAllFullyQualifiedNames` calls
    // `this.getArtifactPaths`, which invokes `CachingSource#getArtifactPaths`.
    return super.getAllFullyQualifiedNames();
  }

  public async readArtifact(name: string): Promise<Artifact | undefined> {
    const cached = this._cache?.artifactNameToArtifact.get(name);
    if (cached !== undefined) {
      return cached;
    }

    const artifact = await super.readArtifact(name);
    if (artifact === undefined) {
      return undefined;
    }

    this._cache?.artifactNameToArtifact.set(name, artifact);

    return artifact;
  }

  public readArtifactSync(name: string): Artifact | undefined {
    const cached = this._cache?.artifactNameToArtifact.get(name);
    if (cached !== undefined) {
      return cached;
    }

    const artifact = super.readArtifactSync(name);
    if (artifact === undefined) {
      return undefined;
    }

    this._cache?.artifactNameToArtifact.set(name, artifact);

    return artifact;
  }

  public async getBuildInfo(
    fullyQualifiedName: string
  ): Promise<BuildInfo | undefined> {
    let buildInfoPath =
      this._cache?.artifactFQNToBuildInfoPathCache.get(fullyQualifiedName);

    if (buildInfoPath === undefined) {
      buildInfoPath = await super._getBuildInfoPath(fullyQualifiedName);

      if (buildInfoPath === undefined) {
        return undefined;
      }

      this._cache?.artifactFQNToBuildInfoPathCache.set(
        fullyQualifiedName,
        buildInfoPath
      );
    }

    return super._getBuildInfoByPath(buildInfoPath);
  }

  public getBuildInfoSync(fullyQualifiedName: string): BuildInfo | undefined {
    let buildInfoPath =
      this._cache?.artifactFQNToBuildInfoPathCache.get(fullyQualifiedName);

    if (buildInfoPath === undefined) {
      buildInfoPath = super._getBuildInfoPathSync(fullyQualifiedName);

      if (buildInfoPath === undefined) {
        return undefined;
      }

      this._cache?.artifactFQNToBuildInfoPathCache.set(
        fullyQualifiedName,
        buildInfoPath
      );
    }

    return super._getBuildInfoByPathSync(buildInfoPath);
  }

  public async getArtifactPaths(): Promise<string[]> {
    const cached = this._cache?.artifactPaths;
    if (cached !== undefined) {
      return cached;
    }

    const artifactPaths = await super.getArtifactPaths();

    if (this._cache !== undefined) {
      this._cache.artifactPaths = artifactPaths;
    }

    return artifactPaths;
  }

  public async getBuildInfoPaths(): Promise<string[]> {
    const cached = this._cache?.buildInfoPaths;
    if (cached !== undefined) {
      return cached;
    }

    const buildInfoPaths = await super.getBuildInfoPaths();

    if (this._cache !== undefined) {
      this._cache.buildInfoPaths = buildInfoPaths;
    }

    return buildInfoPaths;
  }

  public async getDebugFilePaths(): Promise<string[]> {
    const cached = this._cache?.debugFilePaths;
    if (cached !== undefined) {
      return cached;
    }

    const debugFilePaths = await super.getDebugFilePaths();

    if (this._cache !== undefined) {
      this._cache.debugFilePaths = debugFilePaths;
    }

    return debugFilePaths;
  }

  public async saveArtifactAndDebugFile(
    artifact: Artifact,
    pathToBuildInfo?: string
  ) {
    try {
      await super.saveArtifactAndDebugFile(artifact, pathToBuildInfo);
    } finally {
      this.clearCache();
    }
  }

  public async saveBuildInfo(
    solcVersion: string,
    solcLongVersion: string,
    input: CompilerInput,
    output: CompilerOutput
  ): Promise<string> {
    try {
      return await super.saveBuildInfo(
        solcVersion,
        solcLongVersion,
        input,
        output
      );
    } finally {
      this.clearCache();
    }
  }

  /**
   * Remove all artifacts that don't correspond to the current solidity files
   */
  public async removeObsoleteArtifacts() {
    // We clear the cache here, as we want to be sure this runs correctly
    this.clearCache();

    try {
      await super.removeObsoleteArtifacts();
    } finally {
      // We clear the cache here, as this may have non-existent paths now
      this.clearCache();
    }
  }

  public clearCache() {
    // Avoid accidentally re-enabling the cache
    if (this._cache === undefined) {
      return;
    }

    this._cache = {
      artifactFQNToBuildInfoPathCache: new Map(),
      artifactNameToArtifactPathCache: new Map(),
      artifactNameToArtifact: new Map(),
    };
  }

  public disableCache() {
    this._cache = undefined;
  }

  protected async _getArtifactPath(name: string): Promise<string | undefined> {
    const cached = this._cache?.artifactNameToArtifactPathCache.get(name);
    if (cached !== undefined) {
      return cached;
    }

    const result = await super._getArtifactPath(name);
    if (result === undefined) {
      return undefined;
    }

    this._cache?.artifactNameToArtifactPathCache.set(name, result);
    return result;
  }

  protected _getArtifactPathsSync(): string[] {
    const cached = this._cache?.artifactPaths;
    if (cached !== undefined) {
      return cached;
    }

    const result = super._getArtifactPathsSync();

    if (this._cache !== undefined) {
      this._cache.artifactPaths = result;
    }

    return result;
  }

  /**
   * Synchronous version of _getArtifactPath
   */
  protected _getArtifactPathSync(name: string): string | undefined {
    const cached = this._cache?.artifactNameToArtifactPathCache.get(name);
    if (cached !== undefined) {
      return cached;
    }

    const result = super._getArtifactPathSync(name);
    if (result === undefined) {
      return undefined;
    }

    this._cache?.artifactNameToArtifactPathCache.set(name, result);
    return result;
  }
}
