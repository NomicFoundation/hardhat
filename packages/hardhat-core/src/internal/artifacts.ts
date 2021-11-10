import debug from "debug";
import fsExtra from "fs-extra";
import * as os from "os";
import * as path from "path";

import {
  Artifact,
  Artifacts as IArtifacts,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
  DebugFile,
} from "../types";
import {
  getFullyQualifiedName,
  isFullyQualifiedName,
  parseFullyQualifiedName,
  findDistance,
} from "../utils/contract-names";
import { replaceBackslashes } from "../utils/source-names";

import {
  ARTIFACT_FORMAT_VERSION,
  BUILD_INFO_DIR_NAME,
  BUILD_INFO_FORMAT_VERSION,
  DEBUG_FILE_FORMAT_VERSION,
} from "./constants";
import { HardhatError } from "./core/errors";
import { ERRORS } from "./core/errors-list";
import { glob, globSync } from "./util/glob";
import { createNonCryptographicHashBasedIdentifier } from "./util/hash";

const log = debug("hardhat:core:artifacts");

export class Artifacts implements IArtifacts {
  private _buildInfosGlob: string;
  private _dbgsGlob: string;

  constructor(private _artifactsPath: string) {
    this._buildInfosGlob = path.join(
      this._artifactsPath,
      BUILD_INFO_DIR_NAME,
      "**/*.json"
    );
    this._dbgsGlob = path.join(this._artifactsPath, "**/*.dbg.json");
  }

  public async readArtifact(name: string): Promise<Artifact> {
    const artifactPath = await this._getArtifactPath(name);
    return fsExtra.readJson(artifactPath);
  }

  public readArtifactSync(name: string): Artifact {
    const artifactPath = this._getArtifactPathSync(name);
    return fsExtra.readJsonSync(artifactPath);
  }

  public async artifactExists(name: string): Promise<boolean> {
    try {
      await this.readArtifact(name);
      return true;
    } catch (e) {
      return false;
    }
  }

  public async getAllFullyQualifiedNames(): Promise<string[]> {
    const paths = await this.getArtifactPaths();
    return paths.map((p) => this._getFullyQualifiedNameFromPath(p)).sort();
  }

  public async getBuildInfo(
    fullyQualifiedName: string
  ): Promise<BuildInfo | undefined> {
    const artifactPath =
      this._formArtifactPathFromFullyQualifiedNameSync(fullyQualifiedName);

    const debugFilePath = this._getDebugFilePath(artifactPath);
    const buildInfoPath = await this._getBuildInfoFromDebugFile(debugFilePath);

    if (buildInfoPath === undefined) {
      return undefined;
    }

    return fsExtra.readJSON(buildInfoPath);
  }

  public async getArtifactPaths(): Promise<string[]> {
    const paths = await glob(path.join(this._artifactsPath, "**/*.json"), {
      ignore: [this._buildInfosGlob, this._dbgsGlob],
    });

    return paths.sort();
  }

  public async getBuildInfoPaths(): Promise<string[]> {
    const paths = await glob(this._buildInfosGlob);

    return paths.sort();
  }

  public async getDebugFilePaths(): Promise<string[]> {
    const paths = await glob(this._dbgsGlob);

    return paths.sort();
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
      this._formArtifactPathFromFullyQualifiedNameSync(fullyQualifiedName);

    await fsExtra.ensureDir(path.dirname(artifactPath));

    // write artifact
    await fsExtra.writeJSON(artifactPath, artifact, {
      spaces: 2,
    });

    if (pathToBuildInfo === undefined) {
      return;
    }

    // save debug file
    const debugFilePath = this._getDebugFilePath(artifactPath);
    const debugFile = this._createDebugFile(artifactPath, pathToBuildInfo);

    await fsExtra.writeJSON(debugFilePath, debugFile, {
      spaces: 2,
    });
  }

  public async saveBuildInfo(
    solcVersion: string,
    solcLongVersion: string,
    input: CompilerInput,
    output: CompilerOutput
  ): Promise<string> {
    const buildInfoDir = path.join(this._artifactsPath, BUILD_INFO_DIR_NAME);
    await fsExtra.ensureDir(buildInfoDir);

    const buildInfoName = this._getBuildInfoName(
      solcVersion,
      solcLongVersion,
      input
    );

    const buildInfo = this._createBuildInfo(
      buildInfoName,
      solcVersion,
      solcLongVersion,
      input,
      output
    );

    const buildInfoPath = path.join(buildInfoDir, `${buildInfoName}.json`);
    await fsExtra.writeJson(buildInfoPath, buildInfo, { spaces: 2 });

    return buildInfoPath;
  }

  /**
   * Remove all artifacts that don't correspond to the current solidity files
   */
  public async removeObsoleteArtifacts(
    artifactsEmittedPerFile: Array<{
      sourceName: string;
      artifacts: string[];
    }>
  ) {
    const validArtifactsPaths = new Set<string>();

    for (const { sourceName, artifacts } of artifactsEmittedPerFile) {
      for (const artifactName of artifacts) {
        validArtifactsPaths.add(
          this._getArtifactPathSync(
            getFullyQualifiedName(sourceName, artifactName)
          )
        );
      }
    }

    const existingArtifactsPaths = await this.getArtifactPaths();

    for (const artifactPath of existingArtifactsPaths) {
      if (!validArtifactsPaths.has(artifactPath)) {
        await this._removeArtifactFiles(artifactPath);
      }
    }
  }

  /**
   * Remove all build infos that aren't used by any debug file
   */
  public async removeObsoleteBuildInfos() {
    const debugFiles = await this.getDebugFilePaths();

    const validBuildInfos = new Set<string>();
    for (const debugFile of debugFiles) {
      const buildInfoFile = await this._getBuildInfoFromDebugFile(debugFile);
      if (buildInfoFile !== undefined) {
        validBuildInfos.add(
          path.resolve(path.dirname(debugFile), buildInfoFile)
        );
      }
    }

    const buildInfoFiles = await this.getBuildInfoPaths();

    for (const buildInfoFile of buildInfoFiles) {
      if (!validBuildInfos.has(buildInfoFile)) {
        log(`Removing buildInfo '${buildInfoFile}'`);
        await fsExtra.unlink(buildInfoFile);
      }
    }
  }

  private _getBuildInfoName(
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
   * Returns the absolute path to the artifact that corresponds to the given
   * name.
   *
   * If the name is fully qualified, the path is computed from it.  If not, an
   * artifact that matches the given name is searched in the existing artifacts.
   * If there is an ambiguity, an error is thrown.
   */
  private async _getArtifactPath(name: string): Promise<string> {
    if (isFullyQualifiedName(name)) {
      return this._getArtifactPathFromFullyQualifiedName(name);
    }

    const files = await this.getArtifactPaths();
    return this._getArtifactPathFromFiles(name, files);
  }

  private _createBuildInfo(
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

  private _getArtifactPathsSync(): string[] {
    const paths = globSync(path.join(this._artifactsPath, "**/*.json"), {
      ignore: [this._buildInfosGlob, this._dbgsGlob],
    });

    return paths.sort();
  }

  /**
   * Sync version of _getArtifactPath
   */
  private _getArtifactPathSync(name: string): string {
    if (isFullyQualifiedName(name)) {
      return this._getArtifactPathFromFullyQualifiedNameSync(name);
    }

    const files = this._getArtifactPathsSync();
    return this._getArtifactPathFromFiles(name, files);
  }

  /**
   * Same signature as imported function, but abstracted to handle the only error we consistently care about
   */
  private async _trueCasePath(
    filePath: string,
    basePath?: string
  ): Promise<string | null> {
    const { trueCasePath } = await import("true-case-path");

    try {
      const result = await trueCasePath(filePath, basePath);
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("no matching file exists")) {
          return null;
        }
      }

      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw error;
    }
  }

  /**
   * Same signature as imported function, but abstracted to handle the only error we consistently care about
   * and synchronous
   */
  private _trueCasePathSync(
    filePath: string,
    basePath?: string
  ): string | null {
    const { trueCasePathSync } = require("true-case-path");

    try {
      const result = trueCasePathSync(filePath, basePath);
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("no matching file exists")) {
          return null;
        }
      }

      // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
      throw error;
    }
  }

  private async _getArtifactPathFromFullyQualifiedName(
    fullyQualifiedName: string
  ): Promise<string> {
    const { sourceName, contractName } =
      parseFullyQualifiedName(fullyQualifiedName);

    const artifactPath = path.join(
      this._artifactsPath,
      sourceName,
      `${contractName}.json`
    );

    const trueCaseArtifactPath = await this._trueCasePath(
      path.relative(this._artifactsPath, artifactPath),
      this._artifactsPath
    );

    if (trueCaseArtifactPath === null) {
      return this._handleWrongArtifactForFullyQualifiedName(fullyQualifiedName);
    }

    if (artifactPath !== trueCaseArtifactPath) {
      throw new HardhatError(ERRORS.ARTIFACTS.WRONG_CASING, {
        correct: trueCaseArtifactPath,
        incorrect: artifactPath,
      });
    }

    return artifactPath;
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

  private _handleWrongArtifactForFullyQualifiedName(
    fullyQualifiedName: string
  ): never {
    const names = this._getAllFullyQualifiedNamesSync();

    if (names.length === 0) {
      throw new HardhatError(ERRORS.ARTIFACTS.NOT_FOUND, {
        fullyQualifiedName,
      });
    }

    const similarNames = this._getSimilarContractNames(
      fullyQualifiedName,
      names
    );

    throw new HardhatError(ERRORS.ARTIFACTS.TYPO_SUGGESTION, {
      contractName: fullyQualifiedName,
      similarNames: similarNames.join(os.EOL),
    });
  }

  private _handleWrongArtifactForContractName(
    contractName: string,
    files: string[]
  ): never {
    const names = this._getAllContractNamesFromFiles(files);

    if (names.length === 0) {
      throw new HardhatError(ERRORS.ARTIFACTS.NOT_FOUND, {
        contractName,
      });
    }

    const similarNames = this._getSimilarContractNames(contractName, names);

    if (similarNames.length === 1) {
      throw new HardhatError(ERRORS.ARTIFACTS.TYPO_SUGGESTION, {
        contractName,
        similarNames: similarNames[0],
      });
    }

    this._handleMultipleSimilarContractNames(contractName, files, similarNames);
  }

  /**
   * cases:
   *  given: 'Greter'
   *    'contracts/Greeter.sol:Greeter'
   *    'contracts/Meeter.sol:Greeter'
   *    'Greater'
   *
   *  'Greeter', 'Greeter', and 'Greater' are all 1 edit-distance away from 'Greter'
   *  because user gave contract name here, we want to display fqn's for duplicates in `similarNames`
   */
  private _handleMultipleSimilarContractNames(
    contractName: string,
    files: string[],
    similarNames: string[]
  ): never {
    const groupBy = require("lodash/groupBy");
    const outputNames = [];

    // groupBy(similarNames) === { Greeter: ['Greeter', 'Greeter'], Greater: ['Greater'] }
    for (const nameGroup of groupBy(similarNames).entries()) {
      if (nameGroup.length > 1) {
        const name = nameGroup[0];
        const matchingFiles = files.filter(
          (file) => path.basename(file) === `${name}.json`
        );
        const candidates = matchingFiles
          .map(this._getFullyQualifiedNameFromPath)
          .map(path.normalize);
        outputNames.push(...candidates);
        continue;
      }

      outputNames.push(nameGroup[0]);
    }

    throw new HardhatError(ERRORS.ARTIFACTS.TYPO_SUGGESTION, {
      contractName,
      similarNames: outputNames.join(os.EOL),
    });
  }

  /**
   *
   * @param givenName can be FQN or contract name
   * @param names MUST match type of givenName (i.e. array of FQN's if givenName is FQN)
   * @returns
   */
  private _getSimilarContractNames(
    givenName: string,
    names: string[]
  ): string[] {
    let shortestDistance;
    let mostSimilarNames: string[] = [];
    for (const name of names) {
      const distance = findDistance(givenName, name);

      if (shortestDistance === undefined) {
        shortestDistance = distance;
        mostSimilarNames.push(name);
        continue;
      }

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

  private _formArtifactPathFromFullyQualifiedNameSync(
    fullyQualifiedName: string
  ): string {
    const { sourceName, contractName } =
      parseFullyQualifiedName(fullyQualifiedName);

    return path.join(this._artifactsPath, sourceName, `${contractName}.json`);
  }

  private _getArtifactPathFromFullyQualifiedNameSync(
    fullyQualifiedName: string
  ): string {
    const artifactPath =
      this._formArtifactPathFromFullyQualifiedNameSync(fullyQualifiedName);

    const trueCaseArtifactPath = this._trueCasePathSync(
      path.relative(this._artifactsPath, artifactPath),
      this._artifactsPath
    );

    if (trueCaseArtifactPath === null) {
      return this._handleWrongArtifactForFullyQualifiedName(fullyQualifiedName);
    }

    if (artifactPath !== trueCaseArtifactPath) {
      throw new HardhatError(ERRORS.ARTIFACTS.WRONG_CASING, {
        correct: trueCaseArtifactPath,
        incorrect: artifactPath,
      });
    }

    return artifactPath;
  }

  private _getDebugFilePath(artifactPath: string): string {
    return artifactPath.replace(/\.json$/, ".dbg.json");
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
      const candidates = matchingFiles
        .map((file) => this._getFullyQualifiedNameFromPath(file))
        .map(path.normalize);

      throw new HardhatError(ERRORS.ARTIFACTS.MULTIPLE_FOUND, {
        contractName,
        candidates: candidates.join(os.EOL),
      });
    }

    return matchingFiles[0];
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
   * Remove the artifact file, its debug file and, if it exists, its build
   * info file.
   */
  private async _removeArtifactFiles(artifactPath: string) {
    await fsExtra.remove(artifactPath);

    const debugFilePath = this._getDebugFilePath(artifactPath);
    const buildInfoPath = await this._getBuildInfoFromDebugFile(debugFilePath);

    await fsExtra.remove(debugFilePath);

    if (buildInfoPath !== undefined) {
      await fsExtra.remove(buildInfoPath);
    }
  }

  /**
   * Given the path to a debug file, returns the absolute path to its
   * corresponding build info file if it exists, or undefined otherwise.
   */
  private async _getBuildInfoFromDebugFile(
    debugFilePath: string
  ): Promise<string | undefined> {
    if (await fsExtra.pathExists(debugFilePath)) {
      const { buildInfo } = await fsExtra.readJson(debugFilePath);
      return path.resolve(path.dirname(debugFilePath), buildInfo);
    }

    return undefined;
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
