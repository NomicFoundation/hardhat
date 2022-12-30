import * as os from "os";
import * as path from "path";

import fsExtra from "fs-extra";

import { Artifact, BuildInfo } from "../../types";
import {
  getFullyQualifiedName,
  isFullyQualifiedName,
  parseFullyQualifiedName,
  findDistance,
} from "../../utils/contract-names";
import { replaceBackslashes } from "../../utils/source-names";

import { BUILD_INFO_DIR_NAME, EDIT_DISTANCE_THRESHOLD } from "../constants";
import { HardhatError } from "../core/errors";
import { ERRORS } from "../core/errors-list";
import {
  FileNotFoundError,
  getAllFilesMatching,
  getAllFilesMatchingSync,
  getFileTrueCase,
  getFileTrueCaseSync,
} from "../util/fs-utils";

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

  protected _getBuildInfoByPathSync(
    buildInfoPath: string
  ): BuildInfo | undefined {
    return fsExtra.readJSONSync(buildInfoPath);
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

  /**
   * Synchronous version of _getBuildInfoFromDebugFile
   */
  protected static _getBuildInfoFromDebugFileSync(
    debugFilePath: string
  ): string | undefined {
    if (fsExtra.pathExistsSync(debugFilePath)) {
      const { buildInfo } = fsExtra.readJsonSync(debugFilePath);
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
export class ReadOnlySource extends ReadOnlyByPath {
  constructor(protected _artifactsPath: string) {
    super();
  }

  public async artifactExists(name: string): Promise<boolean> {
    const artifactPath = await this._getArtifactPath(name);

    if (artifactPath === undefined) {
      return false;
    }

    return super._artifactPathExists(artifactPath);
  }

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

  public async readArtifact(name: string): Promise<Artifact | undefined> {
    const artifactPath = await this._getArtifactPath(name);
    if (artifactPath === undefined) {
      return undefined;
    }

    return super._readArtifactByPath(artifactPath);
  }

  public readArtifactSync(name: string): Artifact | undefined {
    const artifactPath = this._getArtifactPathSync(name);
    if (artifactPath === undefined) {
      return undefined;
    }

    return super._readArtifactByPathSync(artifactPath);
  }

  public getSuggestions(name: string): string[] {
    if (isFullyQualifiedName(name)) {
      const fqns = this._getAllFullyQualifiedNamesSync();

      return ReadOnlySource._getSimilarContractNames(name, fqns);
    }

    const files = this._getArtifactPathsSync();
    const names = this._getAllContractNamesFromFiles(files);

    let similarNames = ReadOnlySource._getSimilarContractNames(name, names);

    if (similarNames.length > 1) {
      similarNames = this._filterDuplicatesAsFullyQualifiedNames(
        files,
        similarNames
      );
    }

    return similarNames;
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
  protected async _getArtifactPath(name: string): Promise<string | undefined> {
    let result: string | undefined;
    if (isFullyQualifiedName(name)) {
      result = await this._getValidArtifactPathFromFullyQualifiedName(name);
    } else {
      const files = await this.getArtifactPaths();
      result = this._getArtifactPathFromFiles(name, files);
    }
    return result;
  }

  protected _getArtifactPathSync(name: string): string | undefined {
    let result: string | undefined;
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
  ): string | undefined {
    const matchingFiles = files.filter((file) => {
      return path.basename(file) === `${contractName}.json`;
    });

    if (matchingFiles.length === 0) {
      return undefined;
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
    const buildInfoPath = await ReadOnlySource._getBuildInfoFromDebugFile(
      debugFilePath
    );
    return buildInfoPath;
  }

  protected _getBuildInfoPathSync(
    fullyQualifiedName: string
  ): string | undefined {
    const artifactPath =
      this.formArtifactPathFromFullyQualifiedName(fullyQualifiedName);

    const debugFilePath = this._getDebugFilePath(artifactPath);
    const buildInfoPath =
      ReadOnlySource._getBuildInfoFromDebugFileSync(debugFilePath);
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
  ): Promise<string | undefined> {
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
        return undefined;
      }

      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw e;
    }
  }

  private _getValidArtifactPathFromFullyQualifiedNameSync(
    fullyQualifiedName: string
  ): string | undefined {
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
        return undefined;
      }

      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw e;
    }
  }
}
