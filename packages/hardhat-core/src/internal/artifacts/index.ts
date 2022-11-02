import debug from "debug";
import fsExtra from "fs-extra";
import * as os from "os";
import * as path from "path";
import fsPromises from "fs/promises";

import {
  Artifact,
  Artifacts as IArtifacts,
  ArtifactSource,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
  DebugFile,
} from "../../types";
import {
  getFullyQualifiedName,
  isFullyQualifiedName,
  parseFullyQualifiedName,
  findDistance,
} from "../../utils/contract-names";
import { replaceBackslashes } from "../../utils/source-names";

import {
  ARTIFACT_FORMAT_VERSION,
  BUILD_INFO_DIR_NAME,
  BUILD_INFO_FORMAT_VERSION,
  DEBUG_FILE_FORMAT_VERSION,
  EDIT_DISTANCE_THRESHOLD,
} from "../constants";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import { createNonCryptographicHashBasedIdentifier } from "../util/hash";
import {
  FileNotFoundError,
  getAllFilesMatching,
  getAllFilesMatchingSync,
  getFileTrueCase,
  getFileTrueCaseSync,
} from "../util/fs-utils";

const log = debug("hardhat:core:artifacts");

interface Cache {
  artifactPaths?: string[];
  debugFilePaths?: string[];
  buildInfoPaths?: string[];
  artifactNameToArtifactPathCache: Map<string, string>;
  artifactFQNToBuildInfoPathCache: Map<string, string>;
}

/**
 * The purpose of this class is to encapsulate JSON file I/O. It assumes that
 * all input strings are simply paths, not contract names nor fully-qualified
 * contract names like other interfaces around here accept.
 */
class ReadOnlyByPath {
  protected async _readArtifactByPath(artifactPath: string): Promise<Artifact> {
    return fsExtra.readJson(artifactPath);
  }

  protected _readArtifactByPathSync(artifactPath: string): Artifact {
    return fsExtra.readJsonSync(artifactPath);
  }

  protected async _artifactPathExists(artifactPath: string): Promise<boolean> {
    return fsExtra.pathExists(artifactPath);
  }

  protected async _getBuildInfoByPath(
    buildInfoPath: string
  ): Promise<BuildInfo | undefined> {
    return fsExtra.readJSON(buildInfoPath);
  }

  /**
   * Given the path to a debug file, returns the absolute path to its
   * corresponding build info file if it exists, or undefined otherwise.
   */
  protected static async _getBuildInfoFromDebugFile(
    debugFilePath: string
  ): Promise<string | undefined> {
    if (await fsExtra.pathExists(debugFilePath)) {
      const { buildInfo } = await fsExtra.readJson(debugFilePath);
      return path.resolve(path.dirname(debugFilePath), buildInfo);
    }

    return undefined;
  }

  protected _getDebugFilePath(artifactPath: string): string {
    return artifactPath.replace(/\.json$/, ".dbg.json");
  }
}

/**
 * This class takes responsibility for the mappings between contract names,
 * fully-qualified contract names, and file paths.
 */
class ReadOnlyPathMapping extends ReadOnlyByPath implements ArtifactSource {
  constructor(protected _artifactsPath: string) {
    super();
  }

  public async artifactExists(name: string): Promise<boolean> {
    const artifactPath = await this._getArtifactPath(name);
    return super._artifactPathExists(artifactPath);
  }

  public clearCache(): void {}

  public disableCache(): void {}

  public async getArtifactPaths(): Promise<string[]> {
    const buildInfosDir = path.join(this._artifactsPath, BUILD_INFO_DIR_NAME);

    const paths = await getAllFilesMatching(
      this._artifactsPath,
      (f) =>
        f.endsWith(".json") &&
        !f.startsWith(buildInfosDir) &&
        !f.endsWith(".dbg.json")
    );

    return paths.sort();
  }

  /**
   * Returns the absolute path to the given artifact
   */
  public formArtifactPathFromFullyQualifiedName(
    fullyQualifiedName: string
  ): string {
    const { sourceName, contractName } =
      parseFullyQualifiedName(fullyQualifiedName);

    return path.join(this._artifactsPath, sourceName, `${contractName}.json`);
  }

  public async getAllFullyQualifiedNames(): Promise<string[]> {
    const paths = await this.getArtifactPaths();
    return paths.map((p) => this._getFullyQualifiedNameFromPath(p)).sort();
  }

  public async getBuildInfo(
    fullyQualifiedName: string
  ): Promise<BuildInfo | undefined> {
    const buildInfoPath = await this._getBuildInfoPath(fullyQualifiedName);

    if (buildInfoPath === undefined) {
      return undefined;
    }

    return super._getBuildInfoByPath(buildInfoPath);
  }

  public async getBuildInfoPaths(): Promise<string[]> {
    const paths = await getAllFilesMatching(
      path.join(this._artifactsPath, BUILD_INFO_DIR_NAME),
      (f) => f.endsWith(".json")
    );

    return paths.sort();
  }

  public async getDebugFilePaths(): Promise<string[]> {
    const paths = await getAllFilesMatching(
      path.join(this._artifactsPath),
      (f) => f.endsWith(".dbg.json")
    );

    return paths.sort();
  }

  public async readArtifact(name: string): Promise<Artifact> {
    const artifactPath = await this._getArtifactPath(name);
    return super._readArtifactByPath(artifactPath);
  }

  public readArtifactSync(name: string): Artifact {
    const artifactPath = this._getArtifactPathSync(name);
    return super._readArtifactByPathSync(artifactPath);
  }

  /**
   * If the project has these contracts:
   *   - 'contracts/Greeter.sol:Greeter'
   *   - 'contracts/Meeter.sol:Greeter'
   *   - 'contracts/Greater.sol:Greater'
   *  And the user tries to get an artifact with the name 'Greter', then
   *  the suggestions will be 'Greeter', 'Greeter', and 'Greater'.
   *
   * We don't want to show duplicates here, so we use FQNs for those. The
   * suggestions will then be:
   *   - 'contracts/Greeter.sol:Greeter'
   *   - 'contracts/Meeter.sol:Greeter'
   *   - 'Greater'
   */
  private _filterDuplicatesAsFullyQualifiedNames(
    files: string[],
    similarNames: string[]
  ): string[] {
    const outputNames = [];
    const groups = similarNames.reduce((obj, cur) => {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      obj[cur] = obj[cur] ? obj[cur] + 1 : 1;
      return obj;
    }, {} as { [k: string]: number });

    for (const [name, occurrences] of Object.entries(groups)) {
      if (occurrences > 1) {
        for (const file of files) {
          if (path.basename(file) === `${name}.json`) {
            outputNames.push(this._getFullyQualifiedNameFromPath(file));
          }
        }
        continue;
      }

      outputNames.push(name);
    }

    return outputNames;
  }

  private static _formatSuggestions(
    names: string[],
    contractName: string
  ): string {
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

  private _getAllContractNamesFromFiles(files: string[]): string[] {
    return files.map((file) => {
      const fqn = this._getFullyQualifiedNameFromPath(file);
      return parseFullyQualifiedName(fqn).contractName;
    });
  }

  private _getAllFullyQualifiedNamesSync(): string[] {
    const paths = this._getArtifactPathsSync();
    return paths.map((p) => this._getFullyQualifiedNameFromPath(p)).sort();
  }

  /**
   * Returns the absolute path to the artifact that corresponds to the given
   * name.
   *
   * If the name is fully qualified, the path is computed from it.  If not, an
   * artifact that matches the given name is searched in the existing artifacts.
   * If there is an ambiguity, an error is thrown.
   */
  protected async _getArtifactPath(name: string): Promise<string> {
    let result: string;
    if (isFullyQualifiedName(name)) {
      result = await this._getValidArtifactPathFromFullyQualifiedName(name);
    } else {
      const files = await this.getArtifactPaths();
      result = this._getArtifactPathFromFiles(name, files);
    }
    return result;
  }

  protected _getArtifactPathSync(name: string): string {
    let result: string;
    if (isFullyQualifiedName(name)) {
      result = this._getValidArtifactPathFromFullyQualifiedNameSync(name);
    } else {
      const files = this._getArtifactPathsSync();
      result = this._getArtifactPathFromFiles(name, files);
    }
    return result;
  }

  private _getArtifactPathFromFiles(
    contractName: string,
    files: string[]
  ): string {
    const matchingFiles = files.filter((file) => {
      return path.basename(file) === `${contractName}.json`;
    });

    if (matchingFiles.length === 0) {
      return this._handleWrongArtifactForContractName(contractName, files);
    }

    if (matchingFiles.length > 1) {
      const candidates = matchingFiles.map((file) =>
        this._getFullyQualifiedNameFromPath(file)
      );

      throw new HardhatError(ERRORS.ARTIFACTS.MULTIPLE_FOUND, {
        contractName,
        candidates: candidates.join(os.EOL),
      });
    }

    return matchingFiles[0];
  }

  protected _getArtifactPathsSync(): string[] {
    const buildInfosDir = path.join(this._artifactsPath, BUILD_INFO_DIR_NAME);

    const paths = getAllFilesMatchingSync(
      this._artifactsPath,
      (f) =>
        f.endsWith(".json") &&
        !f.startsWith(buildInfosDir) &&
        !f.endsWith(".dbg.json")
    );

    return paths.sort();
  }

  protected async _getBuildInfoPath(
    fullyQualifiedName: string
  ): Promise<string | undefined> {
    const artifactPath =
      this.formArtifactPathFromFullyQualifiedName(fullyQualifiedName);

    const debugFilePath = this._getDebugFilePath(artifactPath);
    const buildInfoPath = await ReadOnlyPathMapping._getBuildInfoFromDebugFile(
      debugFilePath
    );
    return buildInfoPath;
  }

  /**
   * Returns the FQN of a contract giving the absolute path to its artifact.
   *
   * For example, given a path like
   * `/path/to/project/artifacts/contracts/Foo.sol/Bar.json`, it'll return the
   * FQN `contracts/Foo.sol:Bar`
   */
  private _getFullyQualifiedNameFromPath(absolutePath: string): string {
    const sourceName = replaceBackslashes(
      path.relative(this._artifactsPath, path.dirname(absolutePath))
    );

    const contractName = path.basename(absolutePath).replace(".json", "");

    return getFullyQualifiedName(sourceName, contractName);
  }

  /**
   *
   * @param givenName can be FQN or contract name
   * @param names MUST match type of givenName (i.e. array of FQN's if givenName is FQN)
   * @returns
   */
  private static _getSimilarContractNames(
    givenName: string,
    names: string[]
  ): string[] {
    let shortestDistance = EDIT_DISTANCE_THRESHOLD;
    let mostSimilarNames: string[] = [];
    for (const name of names) {
      const distance = findDistance(givenName, name);

      if (distance < shortestDistance) {
        shortestDistance = distance;
        mostSimilarNames = [name];
        continue;
      }

      if (distance === shortestDistance) {
        mostSimilarNames.push(name);
        continue;
      }
    }

    return mostSimilarNames;
  }

  private async _getValidArtifactPathFromFullyQualifiedName(
    fullyQualifiedName: string
  ): Promise<string> {
    const artifactPath =
      this.formArtifactPathFromFullyQualifiedName(fullyQualifiedName);

    try {
      const trueCasePath = path.join(
        this._artifactsPath,
        await getFileTrueCase(
          this._artifactsPath,
          path.relative(this._artifactsPath, artifactPath)
        )
      );

      if (artifactPath !== trueCasePath) {
        throw new HardhatError(ERRORS.ARTIFACTS.WRONG_CASING, {
          correct: this._getFullyQualifiedNameFromPath(trueCasePath),
          incorrect: fullyQualifiedName,
        });
      }

      return trueCasePath;
    } catch (e) {
      if (e instanceof FileNotFoundError) {
        return this._handleWrongArtifactForFullyQualifiedName(
          fullyQualifiedName
        );
      }

      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw e;
    }
  }

  private _getValidArtifactPathFromFullyQualifiedNameSync(
    fullyQualifiedName: string
  ): string {
    const artifactPath =
      this.formArtifactPathFromFullyQualifiedName(fullyQualifiedName);

    try {
      const trueCasePath = path.join(
        this._artifactsPath,
        getFileTrueCaseSync(
          this._artifactsPath,
          path.relative(this._artifactsPath, artifactPath)
        )
      );

      if (artifactPath !== trueCasePath) {
        throw new HardhatError(ERRORS.ARTIFACTS.WRONG_CASING, {
          correct: this._getFullyQualifiedNameFromPath(trueCasePath),
          incorrect: fullyQualifiedName,
        });
      }

      return trueCasePath;
    } catch (e) {
      if (e instanceof FileNotFoundError) {
        return this._handleWrongArtifactForFullyQualifiedName(
          fullyQualifiedName
        );
      }

      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw e;
    }
  }

  private _handleWrongArtifactForFullyQualifiedName(
    fullyQualifiedName: string
  ): never {
    const names = this._getAllFullyQualifiedNamesSync();

    const similarNames = ReadOnlyPathMapping._getSimilarContractNames(
      fullyQualifiedName,
      names
    );

    throw new HardhatError(ERRORS.ARTIFACTS.NOT_FOUND, {
      contractName: fullyQualifiedName,
      suggestion: ReadOnlyPathMapping._formatSuggestions(
        similarNames,
        fullyQualifiedName
      ),
    });
  }

  private _handleWrongArtifactForContractName(
    contractName: string,
    files: string[]
  ): never {
    const names = this._getAllContractNamesFromFiles(files);

    let similarNames = ReadOnlyPathMapping._getSimilarContractNames(
      contractName,
      names
    );

    if (similarNames.length > 1) {
      similarNames = this._filterDuplicatesAsFullyQualifiedNames(
        files,
        similarNames
      );
    }

    throw new HardhatError(ERRORS.ARTIFACTS.NOT_FOUND, {
      contractName,
      suggestion: ReadOnlyPathMapping._formatSuggestions(
        similarNames,
        contractName
      ),
    });
  }

  /**
   * DO NOT DELETE OR CHANGE
   *
   * use this.formArtifactPathFromFullyQualifiedName instead
   * @deprecated until typechain migrates to public version
   * @see https://github.com/dethcrypto/TypeChain/issues/544
   */
  protected _getArtifactPathFromFullyQualifiedName(
    fullyQualifiedName: string
  ): string {
    const { sourceName, contractName } =
      parseFullyQualifiedName(fullyQualifiedName);

    return path.join(this._artifactsPath, sourceName, `${contractName}.json`);
  }
}

class MutablePathMapping extends ReadOnlyPathMapping implements ArtifactSource {
  // TODO: migrate to here all methods that add, save or remove artifacts, and
  // ultimately responsibility for and interface for all interaction with
  // _validArtifacts.

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

class CachingPathMapping extends MutablePathMapping {
  // Undefined means that the cache is disabled.
  private _cache?: Cache = {
    artifactNameToArtifactPathCache: new Map(),
    artifactFQNToBuildInfoPathCache: new Map(),
  };

  constructor(artifactsPath: string) {
    super(artifactsPath);
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

type SupportedArtifactSource =
  | ArtifactSource
  | ReadOnlyPathMapping
  | MutablePathMapping
  | CachingPathMapping;

export class Artifacts implements IArtifacts {
  private readonly _sourcesInPriorityOrder: SupportedArtifactSource[];

  constructor(artifactsPath: string) {
    this._sourcesInPriorityOrder = [new CachingPathMapping(artifactsPath)];
  }

  public async readArtifact(
    contractNameOrFullyQualifiedName: string
  ): Promise<Artifact> {
    const artifact = await this._getFirstValueFromSources(
      "readArtifact",
      contractNameOrFullyQualifiedName
    );
    if (artifact === undefined) {
      throw new HardhatError(ERRORS.ARTIFACTS.NOT_FOUND, {
        contractName: contractNameOrFullyQualifiedName,
        suggestion: "",
      });
    }
    return artifact;
  }

  public readArtifactSync(contractNameOrFullyQualifiedName: string): Artifact {
    const artifact = this._getFirstValueFromSourcesSync(
      "readArtifactSync",
      contractNameOrFullyQualifiedName
    );
    if (artifact === undefined) {
      throw new HardhatError(ERRORS.ARTIFACTS.NOT_FOUND, {
        contractName: contractNameOrFullyQualifiedName,
        suggestion: "",
      });
    }
    return artifact;
  }

  public artifactExists(
    contractNameOrFullyQualifiedName: string
  ): Promise<boolean> {
    return this._getFirstValueFromSources(
      "artifactExists",
      contractNameOrFullyQualifiedName
    );
  }

  public async getAllFullyQualifiedNames(): Promise<string[]> {
    return (
      await Promise.all(
        this._sourcesInPriorityOrder.map((s) => s.getAllFullyQualifiedNames())
      )
    ).flat();
  }

  public getBuildInfo(
    fullyQualifiedName: string
  ): Promise<BuildInfo | undefined> {
    return this._getFirstValueFromSources("getBuildInfo", fullyQualifiedName);
  }

  public async getArtifactPaths(): Promise<string[]> {
    return (
      await Promise.all(
        this._sourcesInPriorityOrder.map((s) => s.getArtifactPaths())
      )
    ).flat();
  }

  public async getDebugFilePaths(): Promise<string[]> {
    return (
      await Promise.all(
        this._sourcesInPriorityOrder.map((s) => s.getDebugFilePaths())
      )
    ).flat();
  }

  public async getBuildInfoPaths(): Promise<string[]> {
    return (
      await Promise.all(
        this._sourcesInPriorityOrder.map((s) => s.getBuildInfoPaths())
      )
    ).flat();
  }

  public clearCache(): void {
    for (const source of this._sourcesInPriorityOrder) {
      source.clearCache();
    }
  }

  public disableCache(): void {
    for (const source of this._sourcesInPriorityOrder) {
      source.disableCache();
    }
  }

  public saveArtifactAndDebugFile(
    artifact: Artifact,
    pathToBuildInfo?: string
  ): Promise<void> {
    for (const source of this._sourcesInPriorityOrder) {
      if ("saveArtifactAndDebugFile" in source) {
        return source.saveArtifactAndDebugFile(artifact, pathToBuildInfo);
      }
    }
    throw new HardhatError(ERRORS.INTERNAL.NO_SUPPORTED_ARTIFACT_SOURCE);
  }

  public saveBuildInfo(
    solcVersion: string,
    solcLongVersion: string,
    input: CompilerInput,
    output: CompilerOutput
  ): Promise<string> {
    for (const source of this._sourcesInPriorityOrder) {
      if ("saveBuildInfo" in source) {
        return source.saveBuildInfo(
          solcVersion,
          solcLongVersion,
          input,
          output
        );
      }
    }
    throw new HardhatError(ERRORS.INTERNAL.NO_SUPPORTED_ARTIFACT_SOURCE);
  }

  public formArtifactPathFromFullyQualifiedName(
    fullyQualifiedName: string
  ): string {
    for (const source of this._sourcesInPriorityOrder) {
      if ("formArtifactPathFromFullyQualifiedName" in source) {
        return source.formArtifactPathFromFullyQualifiedName(
          fullyQualifiedName
        );
      }
    }
    throw new HardhatError(ERRORS.INTERNAL.NO_SUPPORTED_ARTIFACT_SOURCE);
  }

  public addValidArtifacts(
    validArtifacts: Array<{ sourceName: string; artifacts: string[] }>
  ) {
    for (const source of this._sourcesInPriorityOrder) {
      if ("addValidArtifacts" in source) {
        source.addValidArtifacts(validArtifacts);
        return;
      }
    }
    throw new HardhatError(ERRORS.INTERNAL.NO_SUPPORTED_ARTIFACT_SOURCE);
  }

  public async removeObsoleteArtifacts() {
    for (const source of this._sourcesInPriorityOrder) {
      if ("removeObsoleteArtifacts" in source) {
        await source.removeObsoleteArtifacts();
        return;
      }
    }
    throw new HardhatError(ERRORS.INTERNAL.NO_SUPPORTED_ARTIFACT_SOURCE);
  }

  private async _getFirstValueFromSources(
    method: "readArtifact",
    key: string
  ): Promise<Artifact>;

  private async _getFirstValueFromSources(
    method: "artifactExists",
    key: string
  ): Promise<boolean>;

  private async _getFirstValueFromSources(
    method: "getBuildInfo",
    key: string
  ): Promise<BuildInfo | undefined>;

  private async _getFirstValueFromSources(
    method: keyof ArtifactSource,
    key: string
  ): Promise<boolean | Artifact | string[] | BuildInfo | undefined> {
    /* iterate over the sources to resolve the given name. if a source returns
     * undefined or NOT_FOUND, continue on to the next source. preserve the
     * latest thrown error so that its helpful error message can be delivered
     * in the case where latter sources simply return undefined. if all sources
     * are exhausted, and still nothing is found, throw NOT_FOUND. */
    let caughtError: unknown | undefined;
    for (const source of this._sourcesInPriorityOrder) {
      try {
        const value = await source[method](key);
        if (value === undefined) {
          continue;
        }
        return value;
      } catch (error) {
        if (
          error instanceof HardhatError &&
          error.number === ERRORS.ARTIFACTS.NOT_FOUND.number
        ) {
          caughtError = error;
          continue;
        }
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw error;
      }
    }
    if (caughtError !== undefined) {
      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw caughtError;
    }
  }

  private _getFirstValueFromSourcesSync(
    method: "readArtifactSync",
    key: string
  ): Artifact | undefined;

  private _getFirstValueFromSourcesSync(
    method: keyof Pick<ArtifactSource, "readArtifactSync">,
    key: string
  ): Artifact | undefined {
    // intended to be exactly like _getFirstValueFromSources but without the await

    let caughtError: unknown | undefined;
    for (const source of this._sourcesInPriorityOrder) {
      try {
        const value = source[method](key);
        if (value === undefined) {
          continue;
        }
        return value;
      } catch (error) {
        if (
          error instanceof HardhatError &&
          error.number === ERRORS.ARTIFACTS.NOT_FOUND.number
        ) {
          caughtError = error;
          continue;
        }
        // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
        throw error;
      }
    }
    if (caughtError !== undefined) {
      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw caughtError;
    }
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
