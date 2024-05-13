import debug from "debug";
import * as os from "node:os";
import * as path from "node:path";
import {
  ensureDir,
  exists,
  getAllFilesMatching,
  readJsonFile,
  remove,
  writeJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";
import { HardhatError, assertHardhatInvariant } from "../errors/errors.js";
import {
  Artifact,
  Artifacts as IArtifacts,
  BuildInfo,
  CompilerInput,
  CompilerOutput,
  DebugFile,
} from "../types/index.js";
import { ERRORS } from "../errors/errors-list.js";
import {
  getFullyQualifiedName,
  isFullyQualifiedName,
  parseFullyQualifiedName,
  findDistance,
} from "./contract-names.js";
import { replaceBackslashes } from "./source-names.js";
import {
  ARTIFACT_FORMAT_VERSION,
  BUILD_INFO_DIR_NAME,
  BUILD_INFO_FORMAT_VERSION,
  DEBUG_FILE_FORMAT_VERSION,
  EDIT_DISTANCE_THRESHOLD,
} from "./constants.js";
import { createNonCryptographicHashBasedIdentifier } from "./hash.js";
import { FileNotFoundError, getFileTrueCase } from "./fs-utils.js";

const log = debug("hardhat:core:artifacts");

interface Cache {
  artifactPaths?: string[];
  debugFilePaths?: string[];
  buildInfoPaths?: string[];
  artifactNameToArtifactPathCache: Map<string, string>;
  artifactFQNToBuildInfoPathCache: Map<string, string>;
}

export class Artifacts implements IArtifacts {
  readonly #artifactsPath;
  readonly #validArtifacts: Array<{
    sourceName: string;
    artifacts: string[];
  }>;

  // Undefined means that the cache is disabled.
  #cache?: Cache | undefined = {
    artifactNameToArtifactPathCache: new Map(),
    artifactFQNToBuildInfoPathCache: new Map(),
  };

  constructor(_artifactsPath: string) {
    this.#artifactsPath = _artifactsPath;
    this.#validArtifacts = [];
  }

  public addValidArtifacts(
    validArtifacts: Array<{ sourceName: string; artifacts: string[] }>,
  ) {
    this.#validArtifacts.push(...validArtifacts);
  }

  public async readArtifact(name: string): Promise<Artifact> {
    const artifactPath = await this.#getArtifactPath(name);
    return readJsonFile(artifactPath);
  }

  public async artifactExists(name: string): Promise<boolean> {
    let artifactPath;
    try {
      artifactPath = await this.#getArtifactPath(name);
    } catch (e) {
      if (HardhatError.isHardhatError(e)) {
        return false;
      }

      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw e;
    }

    return exists(artifactPath);
  }

  public async getAllFullyQualifiedNames(): Promise<string[]> {
    const paths = await this.getArtifactPaths();
    return paths.map((p) => this.#getFullyQualifiedNameFromPath(p)).sort();
  }

  public async getBuildInfo(
    fullyQualifiedName: string,
  ): Promise<BuildInfo | undefined> {
    let buildInfoPath =
      this.#cache?.artifactFQNToBuildInfoPathCache.get(fullyQualifiedName);

    if (buildInfoPath === undefined) {
      const artifactPath =
        this.formArtifactPathFromFullyQualifiedName(fullyQualifiedName);

      const debugFilePath = this.#getDebugFilePath(artifactPath);
      buildInfoPath = await this.#getBuildInfoFromDebugFile(debugFilePath);

      if (buildInfoPath === undefined) {
        return undefined;
      }

      this.#cache?.artifactFQNToBuildInfoPathCache.set(
        fullyQualifiedName,
        buildInfoPath,
      );
    }

    return readJsonFile(buildInfoPath);
  }

  public async getArtifactPaths(): Promise<string[]> {
    const cached = this.#cache?.artifactPaths;
    if (cached !== undefined) {
      return cached;
    }

    const paths = await getAllFilesMatching(this.#artifactsPath, (f) =>
      this.#isArtifactPath(f),
    );

    const result = paths.sort();

    if (this.#cache !== undefined) {
      this.#cache.artifactPaths = result;
    }

    return result;
  }

  public async getBuildInfoPaths(): Promise<string[]> {
    const cached = this.#cache?.buildInfoPaths;
    if (cached !== undefined) {
      return cached;
    }

    const paths = await getAllFilesMatching(
      path.join(this.#artifactsPath, BUILD_INFO_DIR_NAME),
      (f) => f.endsWith(".json"),
    );

    const result = paths.sort();

    if (this.#cache !== undefined) {
      this.#cache.buildInfoPaths = result;
    }

    return result;
  }

  public async getDebugFilePaths(): Promise<string[]> {
    const cached = this.#cache?.debugFilePaths;
    if (cached !== undefined) {
      return cached;
    }

    const paths = await getAllFilesMatching(
      path.join(this.#artifactsPath),
      (f) => f.endsWith(".dbg.json"),
    );

    const result = paths.sort();

    if (this.#cache !== undefined) {
      this.#cache.debugFilePaths = result;
    }

    return result;
  }

  public async saveArtifactAndDebugFile(
    artifact: Artifact,
    pathToBuildInfo?: string,
  ) {
    try {
      // artifact
      const fullyQualifiedName = getFullyQualifiedName(
        artifact.sourceName,
        artifact.contractName,
      );

      const artifactPath =
        this.formArtifactPathFromFullyQualifiedName(fullyQualifiedName);

      await ensureDir(path.dirname(artifactPath));

      await Promise.all([
        writeJsonFile(artifactPath, artifact),
        (async () => {
          if (pathToBuildInfo === undefined) {
            return;
          }

          // save debug file
          const debugFilePath = this.#getDebugFilePath(artifactPath);
          const debugFile = this.#createDebugFile(
            artifactPath,
            pathToBuildInfo,
          );

          await writeJsonFile(debugFilePath, debugFile);
        })(),
      ]);
    } finally {
      this.clearCache();
    }
  }

  public async saveBuildInfo(
    solcVersion: string,
    solcLongVersion: string,
    input: CompilerInput,
    output: CompilerOutput,
  ): Promise<string> {
    try {
      const buildInfoDir = path.join(this.#artifactsPath, BUILD_INFO_DIR_NAME);
      await ensureDir(buildInfoDir);

      const buildInfoName = await this.#getBuildInfoName(
        solcVersion,
        solcLongVersion,
        input,
      );

      const buildInfo = this.#createBuildInfo(
        buildInfoName,
        solcVersion,
        solcLongVersion,
        input,
        output,
      );

      const buildInfoPath = path.join(buildInfoDir, `${buildInfoName}.json`);

      // JSON.stringify of the entire build info can be really slow
      // in larger projects, so we stringify per part and incrementally create
      // the JSON in the file.
      //
      // We split this code into different curly-brace-enclosed scopes so that
      // partial JSON strings get out of scope sooner and hence can be reclaimed
      // by the GC if needed.
      await writeUtf8File(buildInfoPath, "", "a");

      try {
        {
          const withoutOutput = JSON.stringify({
            ...buildInfo,
            output: undefined,
          });

          // We write the JSON (without output) except the last }
          await writeUtf8File(buildInfoPath, withoutOutput.slice(0, -1), "a");
        }

        {
          const outputWithoutSourcesAndContracts = JSON.stringify({
            ...buildInfo.output,
            sources: undefined,
            contracts: undefined,
          });

          // We start writing the output
          await writeUtf8File(buildInfoPath, ',"output":', "a");

          // Write the output object except for the last }
          await writeUtf8File(
            buildInfoPath,
            outputWithoutSourcesAndContracts.slice(0, -1),
            "a",
          );

          // If there were other field apart from sources and contracts we need
          // a comma
          if (outputWithoutSourcesAndContracts.length > 2) {
            await writeUtf8File(buildInfoPath, ",", "a");
          }
        }

        // Writing the sources
        await writeUtf8File(buildInfoPath, '"sources":{', "a");

        let isFirst = true;
        for (const [name, value] of Object.entries(
          buildInfo.output.sources ?? {},
        )) {
          if (isFirst) {
            isFirst = false;
          } else {
            await writeUtf8File(buildInfoPath, ",", "a");
          }

          await writeUtf8File(
            buildInfoPath,
            `${JSON.stringify(name)}:${JSON.stringify(value)}`,
            "a",
          );
        }

        // Close sources object
        await writeUtf8File(buildInfoPath, "}", "a");

        // Writing the contracts
        await writeUtf8File(buildInfoPath, ',"contracts":{', "a");

        isFirst = true;
        for (const [name, value] of Object.entries(
          buildInfo.output.contracts ?? {},
        )) {
          if (isFirst) {
            isFirst = false;
          } else {
            await writeUtf8File(buildInfoPath, ",", "a");
          }

          await writeUtf8File(
            buildInfoPath,
            `${JSON.stringify(name)}:${JSON.stringify(value)}`,
            "a",
          );
        }

        // close contracts object
        await writeUtf8File(buildInfoPath, "}", "a");
        // close output object
        await writeUtf8File(buildInfoPath, "}", "a");
        // close build info object
        await writeUtf8File(buildInfoPath, "}", "a");
      } finally {
        await writeUtf8File(buildInfoPath, "\n", "a");
      }

      return buildInfoPath;
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
      const validArtifactPaths = await Promise.all(
        this.#validArtifacts.flatMap(({ sourceName, artifacts }) =>
          artifacts.map((artifactName) =>
            this.#getArtifactPath(
              getFullyQualifiedName(sourceName, artifactName),
            ),
          ),
        ),
      );

      const validArtifactsPathsSet = new Set<string>(validArtifactPaths);

      for (const { sourceName, artifacts } of this.#validArtifacts) {
        for (const artifactName of artifacts) {
          validArtifactsPathsSet.add(
            this.formArtifactPathFromFullyQualifiedName(
              getFullyQualifiedName(sourceName, artifactName),
            ),
          );
        }
      }

      const existingArtifactsPaths = await this.getArtifactPaths();

      await Promise.all(
        existingArtifactsPaths
          .filter((artifactPath) => !validArtifactsPathsSet.has(artifactPath))
          .map((artifactPath) => this.#removeArtifactFiles(artifactPath)),
      );

      await this.#removeObsoleteBuildInfos();
    } finally {
      // We clear the cache here, as this may have non-existent paths now
      this.clearCache();
    }
  }

  /**
   * Returns the absolute path to the given artifact
   * @throws {HardhatError} If the name is not fully qualified.
   */
  public formArtifactPathFromFullyQualifiedName(
    fullyQualifiedName: string,
  ): string {
    const { sourceName, contractName } =
      parseFullyQualifiedName(fullyQualifiedName);

    return path.join(this.#artifactsPath, sourceName, `${contractName}.json`);
  }

  public clearCache() {
    // Avoid accidentally re-enabling the cache
    if (this.#cache === undefined) {
      return;
    }

    this.#cache = {
      artifactFQNToBuildInfoPathCache: new Map(),
      artifactNameToArtifactPathCache: new Map(),
    };
  }

  public disableCache() {
    this.#cache = undefined;
  }

  /**
   * Remove all build infos that aren't used by any debug file
   */
  async #removeObsoleteBuildInfos() {
    const debugFiles = await this.getDebugFilePaths();

    const buildInfos = await Promise.all(
      debugFiles.map(async (debugFile) => {
        const buildInfoFile = await this.#getBuildInfoFromDebugFile(debugFile);
        if (buildInfoFile !== undefined) {
          return path.resolve(path.dirname(debugFile), buildInfoFile);
        }
      }),
    );

    const filteredBuildInfos: string[] = buildInfos.filter(
      (bf): bf is string => typeof bf === "string",
    );

    const validBuildInfos = new Set<string>(filteredBuildInfos);

    const buildInfoFiles = await this.getBuildInfoPaths();

    await Promise.all(
      buildInfoFiles
        .filter((buildInfoFile) => !validBuildInfos.has(buildInfoFile))
        .map(async (buildInfoFile) => {
          log(`Removing buildInfo '${buildInfoFile}'`);
          await remove(buildInfoFile);
        }),
    );
  }

  async #getBuildInfoName(
    solcVersion: string,
    solcLongVersion: string,
    input: CompilerInput,
  ): Promise<string> {
    const json = JSON.stringify({
      _format: BUILD_INFO_FORMAT_VERSION,
      solcVersion,
      solcLongVersion,
      input,
    });

    return (
      await createNonCryptographicHashBasedIdentifier(Buffer.from(json))
    ).toString("hex");
  }

  /**
   * Returns the absolute path to the artifact that corresponds to the given
   * name.
   *
   * If the name is fully qualified, the path is computed from it.  If not, an
   * artifact that matches the given name is searched in the existing artifacts.
   * If there is an ambiguity, an error is thrown.
   *
   * @throws {HardhatError} with descriptor:
   * - {@link ERRORS.ARTIFACTS.WRONG_CASING} if the path case doesn't match the one in the filesystem.
   * - {@link ERRORS.ARTIFACTS.MULTIPLE_FOUND} if there are multiple artifacts matching the given contract name.
   * - {@link ERRORS.ARTIFACTS.NOT_FOUND} if the artifact is not found.
   */
  async #getArtifactPath(name: string): Promise<string> {
    const cached = this.#cache?.artifactNameToArtifactPathCache.get(name);
    if (cached !== undefined) {
      return cached;
    }

    let result: string;
    if (isFullyQualifiedName(name)) {
      result = await this.#getValidArtifactPathFromFullyQualifiedName(name);
    } else {
      const files = await this.getArtifactPaths();
      result = this.#getArtifactPathFromFiles(name, files);
    }

    this.#cache?.artifactNameToArtifactPathCache.set(name, result);
    return result;
  }

  #createBuildInfo(
    id: string,
    solcVersion: string,
    solcLongVersion: string,
    input: CompilerInput,
    output: CompilerOutput,
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

  #createDebugFile(artifactPath: string, pathToBuildInfo: string) {
    const relativePathToBuildInfo = path.relative(
      path.dirname(artifactPath),
      pathToBuildInfo,
    );

    const debugFile: DebugFile = {
      _format: DEBUG_FILE_FORMAT_VERSION,
      buildInfo: relativePathToBuildInfo,
    };

    return debugFile;
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
      this.formArtifactPathFromFullyQualifiedName(fullyQualifiedName);

    try {
      const trueCasePath = path.join(
        this.#artifactsPath,
        await getFileTrueCase(
          this.#artifactsPath,
          path.relative(this.#artifactsPath, artifactPath),
        ),
      );

      if (artifactPath !== trueCasePath) {
        throw new HardhatError(ERRORS.ARTIFACTS.WRONG_CASING, {
          correct: this.#getFullyQualifiedNameFromPath(trueCasePath),
          incorrect: fullyQualifiedName,
        });
      }

      return trueCasePath;
    } catch (e) {
      if (e instanceof FileNotFoundError) {
        return this.#handleWrongArtifactForFullyQualifiedName(
          fullyQualifiedName,
        );
      }

      // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
      throw e;
    }
  }

  #getAllContractNamesFromFiles(files: string[]): string[] {
    return files.map((file) => {
      const fqn = this.#getFullyQualifiedNameFromPath(file);
      return parseFullyQualifiedName(fqn).contractName;
    });
  }

  #formatSuggestions(names: string[], contractName: string): string {
    switch (names.length) {
      case 0:
        return "";
      case 1:
        return `Did you mean "${names[0] as string}"?`;
      default:
        return `We found some that were similar:

${names.map((n) => `  * ${n}`).join(os.EOL)}

Please replace "${contractName}" for the correct contract name wherever you are trying to read its artifact.
`;
    }
  }

  /**
   * @throws {HardhatError} with a list of similar contract names.
   */
  async #handleWrongArtifactForFullyQualifiedName(
    fullyQualifiedName: string,
  ): Promise<never> {
    const names = await this.getAllFullyQualifiedNames();

    const similarNames = this.#getSimilarContractNames(
      fullyQualifiedName,
      names,
    );

    throw new HardhatError(ERRORS.ARTIFACTS.NOT_FOUND, {
      contractName: fullyQualifiedName,
      suggestion: this.#formatSuggestions(similarNames, fullyQualifiedName),
    });
  }

  /**
   * @throws {HardhatError} with a list of similar contract names.
   */
  #handleWrongArtifactForContractName(
    contractName: string,
    files: string[],
  ): never {
    const names = this.#getAllContractNamesFromFiles(files);

    let similarNames = this.#getSimilarContractNames(contractName, names);

    if (similarNames.length > 1) {
      similarNames = this.#filterDuplicatesAsFullyQualifiedNames(
        files,
        similarNames,
      );
    }

    throw new HardhatError(ERRORS.ARTIFACTS.NOT_FOUND, {
      contractName,
      suggestion: this.#formatSuggestions(similarNames, contractName),
    });
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
  #filterDuplicatesAsFullyQualifiedNames(
    files: string[],
    similarNames: string[],
  ): string[] {
    const outputNames = [];
    const groups = similarNames.reduce(
      (obj, cur) => {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        obj[cur] = obj[cur] ? (obj[cur] as number) + 1 : 1;
        return obj;
      },
      {} as { [k: string]: number },
    );

    for (const [name, occurrences] of Object.entries(groups)) {
      if (occurrences > 1) {
        for (const file of files) {
          if (path.basename(file) === `${name}.json`) {
            outputNames.push(this.#getFullyQualifiedNameFromPath(file));
          }
        }
        continue;
      }

      outputNames.push(name);
    }

    return outputNames;
  }

  /**
   *
   * @param givenName can be FQN or contract name
   * @param names MUST match type of givenName (i.e. array of FQN's if givenName is FQN)
   * @returns
   */
  #getSimilarContractNames(givenName: string, names: string[]): string[] {
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

  // #getValidArtifactPathFromFullyQualifiedNameSync(
  //   fullyQualifiedName: string,
  // ): string {
  //   const artifactPath =
  //     this.formArtifactPathFromFullyQualifiedName(fullyQualifiedName);

  //   try {
  //     const trueCasePath = path.join(
  //       this.#artifactsPath,
  //       getFileTrueCaseSync(
  //         this.#artifactsPath,
  //         path.relative(this.#artifactsPath, artifactPath),
  //       ),
  //     );

  //     if (artifactPath !== trueCasePath) {
  //       throw new HardhatError(ERRORS.ARTIFACTS.WRONG_CASING, {
  //         correct: this.#getFullyQualifiedNameFromPath(trueCasePath),
  //         incorrect: fullyQualifiedName,
  //       });
  //     }

  //     return trueCasePath;
  //   } catch (e) {
  //     if (e instanceof FileNotFoundError) {
  //       return this.#handleWrongArtifactForFullyQualifiedName(
  //         fullyQualifiedName,
  //       );
  //     }

  //     // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
  //     throw e;
  //   }
  // }

  #getDebugFilePath(artifactPath: string): string {
    return artifactPath.replace(/\.json$/, ".dbg.json");
  }

  /**
   * Gets the path to the artifact file for the given contract name.
   * @throws {HardhatError} with descriptor:
   * - {@link ERRORS.ARTIFACTS.NOT_FOUND} if there are no artifacts matching the given contract name.
   * - {@link ERRORS.ARTIFACTS.MULTIPLE_FOUND} if there are multiple artifacts matching the given contract name.
   */
  #getArtifactPathFromFiles(contractName: string, files: string[]): string {
    const matchingFiles = files.filter((file) => {
      return path.basename(file) === `${contractName}.json`;
    });

    if (matchingFiles.length === 0) {
      return this.#handleWrongArtifactForContractName(contractName, files);
    }

    if (matchingFiles.length > 1) {
      const candidates = matchingFiles.map((file) =>
        this.#getFullyQualifiedNameFromPath(file),
      );

      throw new HardhatError(ERRORS.ARTIFACTS.MULTIPLE_FOUND, {
        contractName,
        candidates: candidates.join(os.EOL),
      });
    }

    assertHardhatInvariant(
      matchingFiles[0] !== undefined,
      "Matching file is undefined",
    );

    return matchingFiles[0];
  }

  /**
   * Returns the FQN of a contract giving the absolute path to its artifact.
   *
   * For example, given a path like
   * `/path/to/project/artifacts/contracts/Foo.sol/Bar.json`, it'll return the
   * FQN `contracts/Foo.sol:Bar`
   */
  #getFullyQualifiedNameFromPath(absolutePath: string): string {
    const sourceName = replaceBackslashes(
      path.relative(this.#artifactsPath, path.dirname(absolutePath)),
    );

    const contractName = path.basename(absolutePath).replace(".json", "");

    return getFullyQualifiedName(sourceName, contractName);
  }

  /**
   * Remove the artifact file and its debug file.
   */
  async #removeArtifactFiles(artifactPath: string) {
    await remove(artifactPath);

    const debugFilePath = this.#getDebugFilePath(artifactPath);

    await remove(debugFilePath);
  }

  /**
   * Given the path to a debug file, returns the absolute path to its
   * corresponding build info file if it exists, or undefined otherwise.
   */
  async #getBuildInfoFromDebugFile(
    debugFilePath: string,
  ): Promise<string | undefined> {
    if (await exists(debugFilePath)) {
      const { buildInfo } = await readJsonFile<any>(debugFilePath);
      return path.resolve(path.dirname(debugFilePath), buildInfo);
    }

    return undefined;
  }

  #isArtifactPath(file: string) {
    return (
      file.endsWith(".json") &&
      file !== path.join(this.#artifactsPath, "package.json") &&
      !file.startsWith(path.join(this.#artifactsPath, BUILD_INFO_DIR_NAME)) &&
      !file.endsWith(".dbg.json")
    );
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
  contractOutput: any,
): Artifact {
  const evmBytecode = contractOutput.evm?.bytecode;
  let bytecode: string = evmBytecode?.object ?? "";

  if (bytecode.slice(0, 2).toLowerCase() !== "0x") {
    bytecode = `0x${bytecode}`;
  }

  const evmDeployedBytecode = contractOutput.evm?.deployedBytecode;
  let deployedBytecode: string = evmDeployedBytecode?.object ?? "";

  if (deployedBytecode.slice(0, 2).toLowerCase() !== "0x") {
    deployedBytecode = `0x${deployedBytecode}`;
  }

  const linkReferences = evmBytecode?.linkReferences ?? {};
  const deployedLinkReferences = evmDeployedBytecode?.linkReferences ?? {};

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
