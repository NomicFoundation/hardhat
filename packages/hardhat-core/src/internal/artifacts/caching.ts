import {
  Artifact,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
} from "../../types";

import { MutablePathMapping } from "./mutable";

interface Cache {
  artifactPaths?: string[];
  debugFilePaths?: string[];
  buildInfoPaths?: string[];
  artifactNameToArtifactPathCache: Map<string, string>;
  artifactFQNToBuildInfoPathCache: Map<string, string>;
  artifactNameToArtifact: Map<string, Artifact>;
}

export class CachingPathMapping extends MutablePathMapping {
  // Undefined means that the cache is disabled.
  private _cache?: Cache = {
    artifactNameToArtifactPathCache: new Map(),
    artifactFQNToBuildInfoPathCache: new Map(),
    artifactNameToArtifact: new Map(),
  };

  constructor(artifactsPath: string) {
    super(artifactsPath);
  }

  public async readArtifact(name: string): Promise<Artifact> {
    let artifact = this._cache?.artifactNameToArtifact.get(name);

    if (artifact === undefined) {
      artifact = await super.readArtifact(name);
    }

    this._cache?.artifactNameToArtifact.set(name, artifact);

    return artifact;
  }

  public readArtifactSync(name: string): Artifact {
    let artifact = this._cache?.artifactNameToArtifact.get(name);

    if (artifact === undefined) {
      artifact = super.readArtifactSync(name);
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

  public async getArtifactPaths(): Promise<string[]> {
    const cached = this._cache?.artifactPaths;
    if (cached !== undefined) {
      return cached;
    }

    const result = await super.getArtifactPaths();

    if (this._cache !== undefined) {
      this._cache.artifactPaths = result;
    }

    return result;
  }

  public async getBuildInfoPaths(): Promise<string[]> {
    const cached = this._cache?.buildInfoPaths;
    if (cached !== undefined) {
      return cached;
    }

    const result = await super.getBuildInfoPaths();

    if (this._cache !== undefined) {
      this._cache.buildInfoPaths = result;
    }

    return result;
  }

  public async getDebugFilePaths(): Promise<string[]> {
    const cached = this._cache?.debugFilePaths;
    if (cached !== undefined) {
      return cached;
    }

    const result = await super.getDebugFilePaths();

    if (this._cache !== undefined) {
      this._cache.debugFilePaths = result;
    }

    return result;
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

  protected async _getArtifactPath(name: string): Promise<string> {
    const cached = this._cache?.artifactNameToArtifactPathCache.get(name);
    if (cached !== undefined) {
      return cached;
    }

    const result = await super._getArtifactPath(name);

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
   * Sync version of _getArtifactPath
   */
  protected _getArtifactPathSync(name: string): string {
    const cached = this._cache?.artifactNameToArtifactPathCache.get(name);
    if (cached !== undefined) {
      return cached;
    }

    const result = super._getArtifactPathSync(name);

    this._cache?.artifactNameToArtifactPathCache.set(name, result);
    return result;
  }
}

export { MutablePathMapping } from "./mutable";
