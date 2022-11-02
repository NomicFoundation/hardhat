import debug from "debug";
import * as path from "path";
import fsPromises from "fs/promises";

import fsExtra from "fs-extra";

import { getFullyQualifiedName } from "../../utils/contract-names";
import { createNonCryptographicHashBasedIdentifier } from "../util/hash";
import {
  Artifact,
  ArtifactSource,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
  DebugFile,
} from "../../types";
import {
  BUILD_INFO_DIR_NAME,
  BUILD_INFO_FORMAT_VERSION,
  DEBUG_FILE_FORMAT_VERSION,
} from "../constants";
import { ReadOnlyPathMapping } from "./readonly";

const log = debug("hardhat:core:artifacts");

interface Cache {
  artifactPaths?: string[];
  debugFilePaths?: string[];
  buildInfoPaths?: string[];
  artifactNameToArtifactPathCache: Map<string, string>;
  artifactFQNToBuildInfoPathCache: Map<string, string>;
  artifactNameToArtifact: Map<string, Artifact>;
}

export { ReadOnlyPathMapping } from "./readonly";

export class MutablePathMapping
  extends ReadOnlyPathMapping
  implements ArtifactSource
{
  private _validArtifacts: Array<{ sourceName: string; artifacts: string[] }>;

  constructor(artifactsPath: string) {
    super(artifactsPath);
    this._validArtifacts = [];
  }

  public addValidArtifacts(
    validArtifacts: Array<{ sourceName: string; artifacts: string[] }>
  ) {
    this._validArtifacts.push(...validArtifacts);
  }

  /**
   * Remove all artifacts that don't correspond to the current solidity files
   */
  public async removeObsoleteArtifacts() {
    const validArtifactPaths = await Promise.all(
      this._validArtifacts.flatMap(({ sourceName, artifacts }) =>
        artifacts.map((artifactName) =>
          this._getArtifactPath(getFullyQualifiedName(sourceName, artifactName))
        )
      )
    );

    const validArtifactsPathsSet = new Set<string>(validArtifactPaths);

    for (const { sourceName, artifacts } of this._validArtifacts) {
      for (const artifactName of artifacts) {
        validArtifactsPathsSet.add(
          this.formArtifactPathFromFullyQualifiedName(
            getFullyQualifiedName(sourceName, artifactName)
          )
        );
      }
    }

    const existingArtifactsPaths = await this.getArtifactPaths();

    await Promise.all(
      existingArtifactsPaths
        .filter((artifactPath) => !validArtifactsPathsSet.has(artifactPath))
        .map((artifactPath) => this._removeArtifactFiles(artifactPath))
    );

    await this._removeObsoleteBuildInfos();
  }

  public async saveArtifactAndDebugFile(
    artifact: Artifact,
    pathToBuildInfo?: string
  ) {
    // artifact
    const fullyQualifiedName = getFullyQualifiedName(
      artifact.sourceName,
      artifact.contractName
    );

    const artifactPath =
      this.formArtifactPathFromFullyQualifiedName(fullyQualifiedName);

    await fsExtra.ensureDir(path.dirname(artifactPath));

    await Promise.all([
      fsExtra.writeJSON(artifactPath, artifact, {
        spaces: 2,
      }),
      (async () => {
        if (pathToBuildInfo === undefined) {
          return;
        }

        // save debug file
        const debugFilePath = this._getDebugFilePath(artifactPath);
        const debugFile = this._createDebugFile(artifactPath, pathToBuildInfo);

        await fsExtra.writeJSON(debugFilePath, debugFile, {
          spaces: 2,
        });
      })(),
    ]);
  }

  public async saveBuildInfo(
    solcVersion: string,
    solcLongVersion: string,
    input: CompilerInput,
    output: CompilerOutput
  ): Promise<string> {
    const buildInfoDir = path.join(this._artifactsPath, BUILD_INFO_DIR_NAME);
    await fsExtra.ensureDir(buildInfoDir);

    const buildInfoName = MutablePathMapping._getBuildInfoName(
      solcVersion,
      solcLongVersion,
      input
    );

    const buildInfo = MutablePathMapping._createBuildInfo(
      buildInfoName,
      solcVersion,
      solcLongVersion,
      input,
      output
    );

    const buildInfoPath = path.join(buildInfoDir, `${buildInfoName}.json`);

    // JSON.stringify of the entire build info can be really slow
    // in larger projects, so we stringify per part and incrementally create
    // the JSON in the file.
    //
    // We split this code into different curly-brace-enclosed scopes so that
    // partial JSON strings get out of scope sooner and hence can be reclaimed
    // by the GC if needed.
    const file = await fsPromises.open(buildInfoPath, "w");
    try {
      {
        const withoutOutput = JSON.stringify({
          ...buildInfo,
          output: undefined,
        });

        // We write the JSON (without output) except the last }
        await file.write(withoutOutput.slice(0, -1));
      }

      {
        const outputWithoutSourcesAndContracts = JSON.stringify({
          ...buildInfo.output,
          sources: undefined,
          contracts: undefined,
        });

        // We start writing the output
        await file.write(',"output":');

        // Write the output object except for the last }
        await file.write(outputWithoutSourcesAndContracts.slice(0, -1));

        // If there were other field apart from sources and contracts we need
        // a comma
        if (outputWithoutSourcesAndContracts.length > 2) {
          await file.write(",");
        }
      }

      // Writing the sources
      await file.write('"sources":{');

      let isFirst = true;
      for (const [name, value] of Object.entries(
        buildInfo.output.sources ?? {}
      )) {
        if (isFirst) {
          isFirst = false;
        } else {
          await file.write(",");
        }

        await file.write(`${JSON.stringify(name)}:${JSON.stringify(value)}`);
      }

      // Close sources object
      await file.write("}");

      // Writing the contracts
      await file.write(',"contracts":{');

      isFirst = true;
      for (const [name, value] of Object.entries(
        buildInfo.output.contracts ?? {}
      )) {
        if (isFirst) {
          isFirst = false;
        } else {
          await file.write(",");
        }

        await file.write(`${JSON.stringify(name)}:${JSON.stringify(value)}`);
      }

      // close contracts object
      await file.write("}");
      // close output object
      await file.write("}");
      // close build info object
      await file.write("}");
    } finally {
      await file.close();
    }

    return buildInfoPath;
  }

  private static _createBuildInfo(
    id: string,
    solcVersion: string,
    solcLongVersion: string,
    input: CompilerInput,
    output: CompilerOutput
  ): BuildInfo {
    return {
      id,
      _format: BUILD_INFO_FORMAT_VERSION,
      solcVersion,
      solcLongVersion,
      input,
      output,
    };
  }

  private _createDebugFile(artifactPath: string, pathToBuildInfo: string) {
    const relativePathToBuildInfo = path.relative(
      path.dirname(artifactPath),
      pathToBuildInfo
    );

    const debugFile: DebugFile = {
      _format: DEBUG_FILE_FORMAT_VERSION,
      buildInfo: relativePathToBuildInfo,
    };

    return debugFile;
  }

  private static _getBuildInfoName(
    solcVersion: string,
    solcLongVersion: string,
    input: CompilerInput
  ): string {
    const json = JSON.stringify({
      _format: BUILD_INFO_FORMAT_VERSION,
      solcVersion,
      solcLongVersion,
      input,
    });

    return createNonCryptographicHashBasedIdentifier(
      Buffer.from(json)
    ).toString("hex");
  }

  /**
   * Remove the artifact file, its debug file and, if it exists, its build
   * info file.
   */
  private async _removeArtifactFiles(artifactPath: string) {
    await fsExtra.remove(artifactPath);

    const debugFilePath = this._getDebugFilePath(artifactPath);
    const buildInfoPath = await ReadOnlyPathMapping._getBuildInfoFromDebugFile(
      debugFilePath
    );

    await fsExtra.remove(debugFilePath);

    if (buildInfoPath !== undefined) {
      await fsExtra.remove(buildInfoPath);
    }
  }

  /**
   * Remove all build infos that aren't used by any debug file
   */
  private async _removeObsoleteBuildInfos() {
    const debugFiles = await this.getDebugFilePaths();

    const buildInfos = await Promise.all(
      debugFiles.map(async (debugFile) => {
        const buildInfoFile =
          await ReadOnlyPathMapping._getBuildInfoFromDebugFile(debugFile);
        if (buildInfoFile !== undefined) {
          return path.resolve(path.dirname(debugFile), buildInfoFile);
        } else {
          return undefined;
        }
      })
    );

    const filteredBuildInfos: string[] = buildInfos.filter(
      (bf): bf is string => typeof bf === "string"
    );

    const validBuildInfos = new Set<string>(filteredBuildInfos);

    const buildInfoFiles = await this.getBuildInfoPaths();

    await Promise.all(
      buildInfoFiles
        .filter((buildInfoFile) => !validBuildInfos.has(buildInfoFile))
        .map(async (buildInfoFile) => {
          log(`Removing buildInfo '${buildInfoFile}'`);
          await fsExtra.unlink(buildInfoFile);
        })
    );
  }
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
