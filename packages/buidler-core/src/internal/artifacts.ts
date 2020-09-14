import debug from "debug";
import fsExtra from "fs-extra";
import * as os from "os";
import * as path from "path";

import type { SolidityFilesCache } from "../builtin-tasks/utils/solidity-files-cache";
import { Artifact, SolcInput } from "../types";

import { BUILD_INFO_DIR_NAME } from "./constants";
import { BuidlerError } from "./core/errors";
import { ERRORS } from "./core/errors-list";
import { glob, globSync } from "./util/glob";

const ARTIFACTS_VERSION = 1;

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

  public async getBuildInfoFiles(): Promise<string[]> {
    return glob(this._buildInfosGlob);
  }

  public getBuildInfoFilesSync(): string[] {
    return globSync(this._buildInfosGlob);
  }

  public async getDbgFiles(): Promise<string[]> {
    return glob(this._dbgsGlob);
  }

  public async artifactExists(
    globalName: string,
    artifactName: string
  ): Promise<boolean> {
    return fsExtra.pathExists(
      this._getArtifactPathSync(globalName, artifactName)
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
   * @param artifactsPath the artifacts' directory.
   * @param name          either the contract's name or the fully qualified name
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
   * @param artifactsPath the artifacts directory.
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
   * Stores an artifact in the given path.
   *
   * @param artifactsPath the artifacts' directory.
   * @param globalName the global name of the file that emitted the artifact.
   * @param artifact the artifact to be stored.
   * @param pathToBuildInfo the relative path to the buildInfo for this artifact
   */
  public async saveArtifact(
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
      { version: ARTIFACTS_VERSION, buildInfo: relativePathToBuildInfo },
      {
        spaces: 2,
      }
    );
  }

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
      version: ARTIFACTS_VERSION,
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
    const validArtifacts = new Set<string>();
    for (const { globalName, artifacts } of Object.values(solidityFilesCache)) {
      for (const artifact of artifacts) {
        validArtifacts.add(this._getArtifactPathSync(globalName, artifact));
      }
    }

    const existingArtifacts = await this.getArtifacts();

    for (const artifact of existingArtifacts) {
      if (!validArtifacts.has(artifact)) {
        fsExtra.unlinkSync(artifact);
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
      const { buildInfo } = await fsExtra.readJson(dbgFile);
      validBuildInfos.add(path.resolve(path.dirname(dbgFile), buildInfo));
    }

    const buildInfoFiles = await this.getBuildInfoFiles();

    for (const buildInfoFile of buildInfoFiles) {
      if (!validBuildInfos.has(buildInfoFile)) {
        log(`Removing buildInfo '${buildInfoFile}'`);
        await fsExtra.unlink(buildInfoFile);
      }
    }
  }

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
    const nameWithoutSol = name.replace(/\.sol/, "");
    return path.join(this._artifactsPath, `${nameWithoutSol}.json`);
  }

  private _getArtifactPathFromFiles(name: string, files: string[]): string {
    const matchingFiles = files.filter((file) => {
      const colonIndex = file.indexOf(":");
      if (colonIndex === -1) {
        // TODO throw a proper BuidlerError
        // tslint:disable only-buidler-error
        throw new Error("should never happen");
      }
      const contractName = file.slice(colonIndex + 1);
      return contractName === `${name}.json`;
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

  private _getFullyQualifiedName(absolutePath: string): string {
    return path
      .relative(this._artifactsPath, absolutePath)
      .replace(".json", "")
      .replace(":", ".sol:");
  }

  private _isFullyQualified(name: string) {
    return name.includes(":");
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
    contractName,
    abi: contractOutput.abi,
    bytecode,
    deployedBytecode,
    linkReferences,
    deployedLinkReferences,
  };
}
