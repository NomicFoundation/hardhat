import debug from "debug";
import fsExtra from "fs-extra";
import * as os from "os";
import * as path from "path";

import { Artifact, SolcInput } from "../types";

import { BUILD_INFO_DIR_NAME } from "./constants";
import { assertBuidlerInvariant, BuidlerError } from "./core/errors";
import { ERRORS } from "./core/errors-list";
import { replaceBackslashes } from "./solidity/source-names";
import { glob, globSync } from "./util/glob";

const ARTIFACT_FORMAT_VERSION = "hh-sol-artifact-1";
const DBG_FORMAT_VERSION = "hh-sol-dbg-1";
const BUILD_INFO_FORMAT_VERSION = "hh-sol-build-info-1";

const log = debug("hardhat:core:artifacts");

export class Artifacts {
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

  /**
   * Return a list with the absolute paths of all the existing artifacts.
   */
  public async getArtifacts(): Promise<string[]> {
    const artifactFiles = await glob(
      path.join(this._artifactsPath, "**/*.json"),
      {
        ignore: [this._buildInfosGlob, this._dbgsGlob],
      }
    );

    return artifactFiles;
  }

  public getArtifactsSync(): string[] {
    const artifactFiles = globSync(
      path.join(this._artifactsPath, "**/*.json"),
      {
        ignore: [this._buildInfosGlob, this._dbgsGlob],
      }
    );

    return artifactFiles;
  }

  /**
   * Return a list with the absolute paths of all the existing build info files.
   */
  public async getBuildInfoFiles(): Promise<string[]> {
    return glob(this._buildInfosGlob);
  }

  public getBuildInfoFilesSync(): string[] {
    return globSync(this._buildInfosGlob);
  }

  /**
   * Return a list with the absolute paths of all the existing dbg files.
   */
  public async getDbgFiles(): Promise<string[]> {
    return glob(this._dbgsGlob);
  }

  /**
   * Checks if the artifact that corresponds to the given source name and
   * contract name exists.
   */
  public async artifactExists(
    sourceName: string,
    contractName: string
  ): Promise<boolean> {
    try {
      await this.readArtifact(
        this._getFullyQualifiedName(sourceName, contractName)
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  public artifactExistsSync(sourceName: string, contractName: string): boolean {
    try {
      this.readArtifactSync(
        this._getFullyQualifiedName(sourceName, contractName)
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Asynchronically reads an artifact with the given `contractName` from the given `artifactPath`.
   *
   * @param name  either the contract's name or the fully qualified name
   */
  public async readArtifact(name: string): Promise<Artifact> {
    const { trueCasePath } = await import("true-case-path");
    const artifactPath = await this._getArtifactPath(name);

    try {
      const trueCaseArtifactPath = await trueCasePath(
        path.relative(this._artifactsPath, artifactPath),
        this._artifactsPath
      );

      if (artifactPath !== trueCaseArtifactPath) {
        throw new BuidlerError(ERRORS.ARTIFACTS.WRONG_CASING, {
          correct: trueCaseArtifactPath,
          incorrect: artifactPath,
        });
      }

      return fsExtra.readJson(trueCaseArtifactPath);
    } catch (error) {
      if (
        typeof error.message === "string" &&
        error.message.includes("no matching file exists")
      ) {
        throw new BuidlerError(ERRORS.INTERNAL.WRONG_ARTIFACT_PATH, {
          contractName: name,
          artifactPath,
        });
      }

      // tslint:disable-next-line only-buidler-error
      throw error;
    }
  }

  /**
   * Synchronically reads an artifact with the given `contractName` from the given `artifactPath`.
   *
   * @param name          either the contract's name or the fully qualified name
   */
  public readArtifactSync(name: string): Artifact {
    const { trueCasePathSync } = require("true-case-path");
    const artifactPath = this._getArtifactPathSync(name);

    try {
      const trueCaseArtifactPath = trueCasePathSync(
        path.relative(this._artifactsPath, artifactPath),
        this._artifactsPath
      );

      if (artifactPath !== trueCaseArtifactPath) {
        throw new BuidlerError(ERRORS.ARTIFACTS.WRONG_CASING, {
          correct: trueCaseArtifactPath,
          incorrect: artifactPath,
        });
      }

      return fsExtra.readJsonSync(trueCaseArtifactPath);
    } catch (error) {
      if (
        typeof error.message === "string" &&
        error.message.includes("no matching file exists")
      ) {
        throw new BuidlerError(ERRORS.INTERNAL.WRONG_ARTIFACT_PATH, {
          contractName: name,
          artifactPath,
        });
      }

      // tslint:disable-next-line only-buidler-error
      throw error;
    }
  }

  /**
   * Stores an artifact and its dbg file.
   *
   * @param sourceName the source name of the file that emitted the artifact.
   * @param artifact the artifact to be stored.
   * @param pathToBuildInfo the relative path to the buildInfo for this artifact
   */
  public async saveArtifactFiles(
    sourceName: string,
    artifact: Artifact,
    pathToBuildInfo: string
  ) {
    // artifact
    const fullyQualifiedName = `${sourceName}:${artifact.contractName}`;
    const artifactPath = this._getArtifactPathFromFullyQualifiedName(
      fullyQualifiedName
    );

    await fsExtra.ensureDir(path.dirname(artifactPath));

    // dbg
    const relativePathToBuildInfo = path.relative(
      path.dirname(artifactPath),
      pathToBuildInfo
    );
    const dbgPath = artifactPath.replace(/\.json$/, ".dbg.json");

    // write artifact and dbg
    await fsExtra.writeJSON(artifactPath, artifact, {
      spaces: 2,
    });
    await fsExtra.writeJSON(
      dbgPath,
      { _format: DBG_FORMAT_VERSION, buildInfo: relativePathToBuildInfo },
      {
        spaces: 2,
      }
    );
  }

  /**
   * Saves a build info file using the given data, and returns the absolute path
   * to the written file.
   */
  public async saveBuildInfo(
    input: SolcInput,
    output: any,
    solcVersion: string
  ): Promise<string> {
    const { default: uuid } = await import("uuid/v4");

    const buildInfoDir = path.join(this._artifactsPath, BUILD_INFO_DIR_NAME);
    await fsExtra.ensureDir(buildInfoDir);

    const buildInfoName = uuid();
    const buildInfoPath = path.join(buildInfoDir, `${buildInfoName}.json`);
    await fsExtra.writeJson(buildInfoPath, {
      _format: BUILD_INFO_FORMAT_VERSION,
      input,
      output,
      solcVersion,
    });

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
      for (const artifact of artifacts) {
        validArtifactsPaths.add(
          this._getArtifactPathSync(sourceName, artifact)
        );
      }
    }

    const existingArtifactsPaths = await this.getArtifacts();

    for (const artifactPath of existingArtifactsPaths) {
      if (!validArtifactsPaths.has(artifactPath)) {
        await this._removeArtifactFiles(artifactPath);
      }
    }
  }

  /**
   * Remove all build infos that aren't used by any dbg file
   */
  public async removeObsoleteBuildInfos() {
    const dbgFiles = await this.getDbgFiles();

    const validBuildInfos = new Set<string>();
    for (const dbgFile of dbgFiles) {
      const buildInfoFile = await this._getBuildInfoFromDbg(dbgFile);
      if (buildInfoFile !== undefined) {
        validBuildInfos.add(path.resolve(path.dirname(dbgFile), buildInfoFile));
      }
    }

    const buildInfoFiles = await this.getBuildInfoFiles();

    for (const buildInfoFile of buildInfoFiles) {
      if (!validBuildInfos.has(buildInfoFile)) {
        log(`Removing buildInfo '${buildInfoFile}'`);
        await fsExtra.unlink(buildInfoFile);
      }
    }
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
    if (this._isFullyQualified(name)) {
      return this._getArtifactPathFromFullyQualifiedName(name);
    }

    const files = await this.getArtifacts();
    return this._getArtifactPathFromFiles(name, files);
  }

  private _getArtifactPathSync(
    sourceName: string,
    contractName?: string
  ): string {
    if (contractName === undefined) {
      if (this._isFullyQualified(sourceName)) {
        return this._getArtifactPathFromFullyQualifiedName(sourceName);
      }

      const files = this.getArtifactsSync();
      return this._getArtifactPathFromFiles(sourceName, files);
    }

    const fullyQualifiedName = `${sourceName}:${contractName}`;
    const artifactPath = this._getArtifactPathFromFullyQualifiedName(
      fullyQualifiedName
    );

    return artifactPath;
  }

  private _getArtifactPathFromFullyQualifiedName(name: string): string {
    const parts = name.split(":");
    assertBuidlerInvariant(
      parts.length === 2,
      "A fully qualified contract name should have exactly one colon"
    );
    const [sourceName, contractName] = parts;
    return path.join(this._artifactsPath, sourceName, `${contractName}.json`);
  }

  private _getArtifactPathFromFiles(name: string, files: string[]): string {
    const matchingFiles = files.filter((file) => {
      return path.basename(file) === `${name}.json`;
    });

    if (matchingFiles.length === 0) {
      throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, {
        contractName: name,
      });
    }

    if (matchingFiles.length > 1) {
      const candidates = matchingFiles
        .map((file) => this._getFullyQualifiedNameFromPath(file))
        .map(path.normalize);

      throw new BuidlerError(ERRORS.ARTIFACTS.MULTIPLE_FOUND, {
        contractName: name,
        candidates: candidates.join(os.EOL),
      });
    }

    return matchingFiles[0];
  }

  /**
   * Returns the FQN of a contract giving its source name of its file and its
   * contract name.
   */
  private _getFullyQualifiedName(
    sourceName: string,
    contractName: string
  ): string {
    return `${sourceName}:${contractName}`;
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

    return this._getFullyQualifiedName(sourceName, contractName);
  }

  private _isFullyQualified(name: string) {
    return name.includes(":");
  }

  /**
   * Remove the artifact file, its companion dbg and, if it exists, its build
   * info file.
   */
  private async _removeArtifactFiles(artifactPath: string) {
    await fsExtra.remove(artifactPath);

    const dbgPath = artifactPath.replace(/\.json$/, ".dbg.json");
    const buildInfoPath = await this._getBuildInfoFromDbg(dbgPath);

    await fsExtra.remove(dbgPath);
    if (buildInfoPath !== undefined) {
      await fsExtra.remove(buildInfoPath);
    }
  }

  /**
   * Given the path to a dbg file, returns the absolute path to its
   * corresponding build info file if it exists, or undefined otherwise.
   */
  private async _getBuildInfoFromDbg(
    dbgPath: string
  ): Promise<string | undefined> {
    if (await fsExtra.pathExists(dbgPath)) {
      const { buildInfo } = await fsExtra.readJson(dbgPath);
      return path.resolve(path.dirname(dbgPath), buildInfo);
    }

    return undefined;
  }
}

/**
 * Retrieves an artifact for the given `contractName` from the compilation output.
 *
 * @param contractName the contract's name.
 * @param contractOutput the contract's compilation output as emitted by `solc`.
 */
export function getArtifactFromContractOutput(
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
    abi: contractOutput.abi,
    bytecode,
    deployedBytecode,
    linkReferences,
    deployedLinkReferences,
  };
}
