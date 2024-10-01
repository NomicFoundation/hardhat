import type {
  Artifact,
  ArtifactsManager,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
} from "../../../types/artifacts.js";

import path from "node:path";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@ignored/hardhat-vnext-errors";
import {
  exists,
  getAllFilesMatching,
  getFileTrueCase,
  readJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

export const BUILD_INFO_DIR_NAME = "build-info";

/**
 * This class is a temporary shim implementation of the ArtifactsManager.
 * It has pulled across Hardhat v2 code to ease some development tasks.
 * It will be replaced in its entirety by the new ArtifactsManager with
 * the completion of the new build system.
 *
 * Code within it should be kept as self-contained as possible.
 *
 * TODO: Replace this class with the new ArtifactsManager in Hardhat v3.
 */
export class ArtifactsManagerImplementation implements ArtifactsManager {
  readonly #artifactsPath: string;

  constructor(artifactsPath: string) {
    this.#artifactsPath = artifactsPath;
  }

  public async readArtifact(
    contractNameOrFullyQualifiedName: string,
  ): Promise<Artifact> {
    const artifactPath = await this.#getArtifactPath(
      contractNameOrFullyQualifiedName,
    );

    return readJsonFile(artifactPath);
  }

  /**
   * Returns the absolute path to the artifact that corresponds to the given
   * name.
   *
   * If the name is fully qualified, the path is computed from it.  If not, an
   * artifact that matches the given name is searched in the existing artifacts.
   * If there is an ambiguity, an error is thrown.
   */
  async #getArtifactPath(name: string): Promise<string> {
    let result: string;
    if (this.#isFullyQualifiedName(name)) {
      result = await this.#getValidArtifactPathFromFullyQualifiedName(name);
    } else {
      const files = await this.getArtifactPaths();
      result = this.#getArtifactPathFromFiles(name, files);
    }

    return result;
  }

  #getArtifactPathFromFiles(contractName: string, files: string[]): string {
    const matchingFiles = files.filter((file) => {
      return path.basename(file) === `${contractName}.json`;
    });

    if (matchingFiles.length === 0) {
      throw new HardhatError(HardhatError.ERRORS.INTERNAL.ASSERTION_ERROR, {
        message: `No artifacts found for contract name "${contractName}"`,
      });
    }

    if (matchingFiles.length > 1) {
      const candidates = matchingFiles.map((file) =>
        this.#getFullyQualifiedNameFromPath(file),
      );

      throw new HardhatError(HardhatError.ERRORS.INTERNAL.ASSERTION_ERROR, {
        message: `Multiple artifacts found for contract name "${contractName}": ${candidates.join(",")}`,
      });
    }

    return matchingFiles[0];
  }

  /**
   * Returns true if a name is fully qualified, and not just a bare contract name.
   */
  #isFullyQualifiedName(name: string): boolean {
    return name.includes(":");
  }

  /**
   * Returns the absolute path to the artifact that corresponds to the given
   * fully qualified name.
   * @param fullyQualifiedName The fully qualified name of the contract.
   * @returns The absolute path to the artifact.
   * @throws {HardhatError} with descriptor:
   * - {@link ERRORS.CONTRACT_NAMES.INVALID_FULLY_QUALIFIED_NAME} If the name is not fully qualified.
   * - {@link ERRORS.ARTIFACTS.WRONG_CASING} If the path case doesn't match the one in the filesystem.
   * - {@link ERRORS.ARTIFACTS.NOT_FOUND} If the artifact is not found.
   */
  async #getValidArtifactPathFromFullyQualifiedName(
    fullyQualifiedName: string,
  ): Promise<string> {
    const artifactPath =
      this.#formArtifactPathFromFullyQualifiedName(fullyQualifiedName);

    const trueCasePath = path.join(
      this.#artifactsPath,
      await getFileTrueCase(
        this.#artifactsPath,
        path.relative(this.#artifactsPath, artifactPath),
      ),
    );

    if (artifactPath !== trueCasePath) {
      throw new HardhatError(HardhatError.ERRORS.INTERNAL.ASSERTION_ERROR, {
        message: "Artifact path and true case path should be the same",
      });
    }

    return trueCasePath;
  }

  /**
   * Returns the absolute path to the given artifact
   * @throws {HardhatError} If the name is not fully qualified.
   */
  #formArtifactPathFromFullyQualifiedName(fullyQualifiedName: string): string {
    const { sourceName, contractName } =
      this.#parseFullyQualifiedName(fullyQualifiedName);

    return path.join(this.#artifactsPath, sourceName, `${contractName}.json`);
  }

  /**
   * Parses a fully qualified name.
   *
   * @param fullyQualifiedName It MUST be a fully qualified name.
   * @throws {HardhatError} If the name is not fully qualified.
   */
  #parseFullyQualifiedName(fullyQualifiedName: string): {
    sourceName: string;
    contractName: string;
  } {
    const { sourceName, contractName } = this.#parseName(fullyQualifiedName);

    if (sourceName === undefined) {
      throw new HardhatError(HardhatError.ERRORS.INTERNAL.ASSERTION_ERROR, {
        message: `Failed to parse source name for ${fullyQualifiedName}`,
      });
    }

    return { sourceName, contractName };
  }

  /**
   * Parses a name, which can be a bare contract name, or a fully qualified name.
   */
  #parseName(name: string): {
    sourceName?: string;
    contractName: string;
  } {
    const parts = name.split(":");

    if (parts.length === 1) {
      return { contractName: parts[0] };
    }

    const contractName = parts[parts.length - 1];
    const sourceName = parts.slice(0, parts.length - 1).join(":");

    return { sourceName, contractName };
  }

  public artifactExists(
    _contractNameOrFullyQualifiedName: string,
  ): Promise<boolean> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public async getAllFullyQualifiedNames(): Promise<string[]> {
    const paths = await this.getArtifactPaths();
    return paths.map((p) => this.#getFullyQualifiedNameFromPath(p)).sort();
  }

  /**
   * Returns the FQN of a contract giving the absolute path to its artifact.
   *
   * For example, given a path like
   * `/path/to/project/artifacts/contracts/Foo.sol/Bar.json`, it'll return the
   * FQN `contracts/Foo.sol:Bar`
   */
  #getFullyQualifiedNameFromPath(absolutePath: string): string {
    const sourceName = this.#replaceBackslashes(
      path.relative(this.#artifactsPath, path.dirname(absolutePath)),
    );

    const contractName = path.basename(absolutePath).replace(".json", "");

    return this.#getFullyQualifiedName(sourceName, contractName);
  }

  /**
   * Returns a fully qualified name from a sourceName and contractName.
   */
  #getFullyQualifiedName(sourceName: string, contractName: string): string {
    return `${sourceName}:${contractName}`;
  }

  /**
   * This function replaces backslashes (\\) with slashes (/).
   *
   * Note that a source name must not contain backslashes.
   */
  #replaceBackslashes(str: string): string {
    // Based in the npm module slash
    const isExtendedLengthPath = /^\\\\\?\\/.test(str);
    const hasNonAscii = /[^\u0000-\u0080]+/.test(str);

    if (isExtendedLengthPath || hasNonAscii) {
      return str;
    }

    return str.replace(/\\/g, "/");
  }

  public async getBuildInfo(
    fullyQualifiedName: string,
  ): Promise<BuildInfo | undefined> {
    const artifactPath =
      this.#formArtifactPathFromFullyQualifiedName(fullyQualifiedName);

    const debugFilePath = this.#getDebugFilePath(artifactPath);
    const buildInfoPath = await this.#getBuildInfoFromDebugFile(debugFilePath);

    if (buildInfoPath === undefined) {
      return undefined;
    }

    return readJsonFile(buildInfoPath);
  }

  #getDebugFilePath(artifactPath: string): string {
    return artifactPath.replace(/\.json$/, ".dbg.json");
  }

  /**
   * Given the path to a debug file, returns the absolute path to its
   * corresponding build info file if it exists, or undefined otherwise.
   */
  async #getBuildInfoFromDebugFile(
    debugFilePath: string,
  ): Promise<string | undefined> {
    if (await exists(debugFilePath)) {
      const debugFile = await readJsonFile(debugFilePath);

      assertHardhatInvariant(
        typeof debugFile === "object" &&
          debugFile !== null &&
          "buildInfo" in debugFile &&
          typeof debugFile.buildInfo === "string",
        "Invalid debug file",
      );

      const buildInfo = debugFile.buildInfo;

      return path.resolve(path.dirname(debugFilePath), buildInfo);
    }

    return undefined;
  }

  public async getArtifactPaths(): Promise<string[]> {
    const paths = await getAllFilesMatching(this.#artifactsPath, (f) =>
      this.#isArtifactPath(f),
    );

    const result = paths.sort();

    return result;
  }

  #isArtifactPath(file: string) {
    return (
      file.endsWith(".json") &&
      file !== path.join(this.#artifactsPath, "package.json") &&
      !file.startsWith(path.join(this.#artifactsPath, BUILD_INFO_DIR_NAME)) &&
      !file.endsWith(".dbg.json")
    );
  }

  public getBuildInfoPaths(): Promise<string[]> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public saveArtifact(_artifact: Artifact): Promise<void> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public saveBuildInfo(
    _solcVersion: string,
    _solcLongVersion: string,
    _input: CompilerInput,
    _output: CompilerOutput,
  ): Promise<string> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }

  public getArtifactPath(_fullyQualifiedName: string): Promise<string> {
    throw new HardhatError(HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR, {
      message: "Not implemented in fake artifacts manager",
    });
  }
}
