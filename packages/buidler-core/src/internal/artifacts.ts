import debug from "debug";
import fsExtra from "fs-extra";
import * as os from "os";
import * as path from "path";

import type { SolidityFilesCache } from "../builtin-tasks/utils/solidity-files-cache";
import { Artifact, SolcInput } from "../types";

import { BUILD_INFO_DIR_NAME } from "./constants";
import { assertBuidlerInvariant, BuidlerError } from "./core/errors";
import { ERRORS } from "./core/errors-list";
import { glob, globSync } from "./util/glob";

const ARTIFACT_FORMAT_VERSION = "hh-sol-artifact-1";
const DBG_FORMAT_VERSION = "hh-sol-dbg-1";
const BUILD_INFO_FORMAT_VERSION = "hh-sol-build-info-1";

const log = debug("buidler:core:artifacts");

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
   * Checks if the artifact that corresponds to the given global name and
   * contract name exists.
   */
  public async artifactExists(
    globalName: string,
    contractName: string
  ): Promise<boolean> {
    return fsExtra.pathExists(
      this._getArtifactPathSync(globalName, contractName)
    );
  }

  public artifactExistsSync(globalName: string, artifactName: string): boolean {
    return fsExtra.pathExistsSync(
      this._getArtifactPathSync(globalName, artifactName)
    );
  }

  /**
   * Asynchronically reads an artifact with the given `contractName` from the given `artifactPath`.
   *
   * @param name  either the contract's name or the fully qualified name
   */
  public async readArtifact(name: string): Promise<Artifact> {
    const artifactPath = await this._getArtifactPath(name);

    if (!fsExtra.pathExistsSync(artifactPath)) {
      throw new BuidlerError(ERRORS.INTERNAL.WRONG_ARTIFACT_PATH, {
        contractName: name,
        artifactPath,
      });
    }

    return fsExtra.readJson(artifactPath);
  }

  /**
   * Synchronically reads an artifact with the given `contractName` from the given `artifactPath`.
   *
   * @param name          either the contract's name or the fully qualified name
   */
  public readArtifactSync(name: string): Artifact {
    const artifactPath = this._getArtifactPathSync(name);

    if (!fsExtra.pathExistsSync(artifactPath)) {
      throw new BuidlerError(ERRORS.INTERNAL.WRONG_ARTIFACT_PATH, {
        contractName: name,
        artifactPath,
      });
    }

    return fsExtra.readJsonSync(artifactPath);
  }

  /**
   * Stores an artifact and its dbg file.
   *
   * @param globalName the global name of the file that emitted the artifact.
   * @param artifact the artifact to be stored.
   * @param pathToBuildInfo the relative path to the buildInfo for this artifact
   */
  public async saveArtifactFiles(
    globalName: string,
    artifact: Artifact,
    pathToBuildInfo: string
  ) {
    // artifact
    const fullyQualifiedName = `${globalName}:${artifact.contractName}`;
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
    const { sha256 } = await import("ethereum-cryptography/sha256");

    const buildInfoDir = path.join(this._artifactsPath, BUILD_INFO_DIR_NAME);
    await fsExtra.ensureDir(buildInfoDir);

    const hash = sha256(
      Buffer.from(JSON.stringify({ input, solcVersion }))
    ).toString("hex");
    const buildInfoPath = path.join(buildInfoDir, `${hash}.json`);
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
  public async removeObsoleteArtifacts(solidityFilesCache: SolidityFilesCache) {
    const validArtifactsPaths = new Set<string>();
    const cachedFiles = Object.values(solidityFilesCache.files);

    for (const { globalName, artifacts } of cachedFiles) {
      for (const artifact of artifacts) {
        validArtifactsPaths.add(
          this._getArtifactPathSync(globalName, artifact)
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
    globalName: string,
    contractName?: string
  ): string {
    if (contractName === undefined) {
      if (this._isFullyQualified(globalName)) {
        return this._getArtifactPathFromFullyQualifiedName(globalName);
      }

      const files = this.getArtifactsSync();
      return this._getArtifactPathFromFiles(globalName, files);
    }

    const fullyQualifiedName = `${globalName}:${contractName}`;
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
    const [globalName, contractName] = parts;
    return path.join(this._artifactsPath, globalName, `${contractName}.json`);
  }

  private _getArtifactPathFromFiles(name: string, files: string[]): string {
    const matchingFiles = files.filter((file) => {
      return file === `${name}.json`;
    });

    if (matchingFiles.length === 0) {
      throw new BuidlerError(ERRORS.ARTIFACTS.NOT_FOUND, {
        contractName: name,
      });
    }

    if (matchingFiles.length > 1) {
      const candidates = matchingFiles
        .map((file) => this._getFullyQualifiedName(file))
        .map(path.normalize);

      throw new BuidlerError(ERRORS.ARTIFACTS.MULTIPLE_FOUND, {
        contractName: name,
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
  private _getFullyQualifiedName(absolutePath: string): string {
    const beforeColon = path.relative(
      this._artifactsPath,
      path.dirname(absolutePath)
    );
    const afterColon = path.basename(absolutePath).replace(".json", "");

    return `${beforeColon}:${afterColon}`;
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
