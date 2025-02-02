import type {
  ArtifactsManager,
  GetAtifactByName,
} from "../../../types/artifacts.js";

import { EOL } from "node:os";
import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  getAllFilesMatching,
  readJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

export const BUILD_INFO_DIR_NAME = "build-info";
export const EDIT_DISTANCE_THRESHOLD = 3;

/**
 * We cache the info that we read from the file system, otherwise we would
 * have to traverse the filesystem every time we need to get the an artifact.
 *
 * To keep our view of the filesystem consistent, we cache everything at the
 * same time, using this interface to organize the data.
 */
interface FsData {
  bareNameToFullyQualifiedNameMap: Map<string, ReadonlySet<string>>;
  allArtifactPaths: ReadonlySet<string>;
  allFullyQualifiedNames: ReadonlySet<string>;
}

export class ArticlesManagerImplementation implements ArtifactsManager {
  readonly #artifactsPath: string;

  // This function can be overriden in the constructor for testing purposes.
  // This class will call it whenever the fsData is not already cached, and will
  // cache the result.
  readonly #readFsData: () => Promise<FsData>;
  #fsData?: FsData;

  constructor(artifactsPath: string, readFsData?: () => Promise<FsData>) {
    this.#artifactsPath = artifactsPath;
    this.#readFsData = readFsData ?? (() => this.#readFsDataFromFileSystem());
  }

  public async readArtifact<ContractNameT extends string>(
    contractNameOrFullyQualifiedName: ContractNameT,
  ): Promise<GetAtifactByName<ContractNameT>> {
    const artifactPath = await this.getArtifactPath(
      contractNameOrFullyQualifiedName,
    );

    return readJsonFile(artifactPath);
  }

  public async getArtifactPath(
    contractNameOrFullyQualifiedName: string,
  ): Promise<string> {
    const fqn = await this.#getFullyQualifiedName(
      contractNameOrFullyQualifiedName,
    );

    return this.#getArtifactPathFromFullyQualifiedName(fqn);
  }

  public async artifactExists(
    contractNameOrFullyQualifiedName: string,
  ): Promise<boolean> {
    try {
      // This throw if the artifact doesn't exist
      await this.getArtifactPath(contractNameOrFullyQualifiedName);

      return true;
    } catch (error) {
      if (HardhatError.isHardhatError(error)) {
        if (error.number === HardhatError.ERRORS.ARTIFACTS.NOT_FOUND.number) {
          return false;
        }
      }

      throw error;
    }
  }

  public async getBuildInfoId(
    fullyQualifiedName: string,
  ): Promise<string | undefined> {
    const artifact = await this.readArtifact(fullyQualifiedName);

    return artifact.buildInfoId;
  }

  public async getAllFullyQualifiedNames(): Promise<ReadonlySet<string>> {
    const { allFullyQualifiedNames } = await this.#getFsData();
    return allFullyQualifiedNames;
  }

  public async getAllBuildInfoIds(): Promise<ReadonlySet<string>> {
    const paths = await getAllFilesMatching(
      path.join(this.#artifactsPath, BUILD_INFO_DIR_NAME),
      (p) => p.endsWith(".json") && !p.endsWith(".output.json"),
    );

    return new Set(paths.map((p) => path.basename(p, ".json")));
  }

  public async getBuildInfoPath(buildInfoId: string): Promise<string> {
    return path.join(
      this.#artifactsPath,
      BUILD_INFO_DIR_NAME,
      buildInfoId + ".json",
    );
  }

  public async getBuildInfoOutputPath(
    buildInfoId: string,
  ): Promise<string | undefined> {
    return path.join(
      this.#artifactsPath,
      BUILD_INFO_DIR_NAME,
      buildInfoId + ".output.json",
    );
  }

  public async clearCache(): Promise<void> {
    this.#fsData = undefined;
  }

  async #getFullyQualifiedName(
    contractNameOrFullyQualifiedName: string,
  ): Promise<string> {
    const { bareNameToFullyQualifiedNameMap, allFullyQualifiedNames } =
      await this.#getFsData();

    if (this.#isFullyQualifiedName(contractNameOrFullyQualifiedName)) {
      if (allFullyQualifiedNames.has(contractNameOrFullyQualifiedName)) {
        return contractNameOrFullyQualifiedName;
      }

      this.#throwNotFoundError(
        contractNameOrFullyQualifiedName,
        bareNameToFullyQualifiedNameMap,
      );
    }

    const fqns = bareNameToFullyQualifiedNameMap.get(
      contractNameOrFullyQualifiedName,
    );

    if (fqns === undefined || fqns.size === 0) {
      this.#throwNotFoundError(
        contractNameOrFullyQualifiedName,
        bareNameToFullyQualifiedNameMap,
      );
    }

    if (fqns.size !== 1) {
      throw new HardhatError(HardhatError.ERRORS.ARTIFACTS.MULTIPLE_FOUND, {
        contractName: contractNameOrFullyQualifiedName,
        candidates: Array.from(fqns).join(EOL),
      });
    }

    const [fqn] = fqns;

    return fqn;
  }

  #throwNotFoundError(
    contractNameOrFullyQualifiedName: string,
    bareNameToFullyQualifiedNameMap: Map<string, ReadonlySet<string>>,
  ): never {
    const similarNames = this.#getSimilarContractNames(
      contractNameOrFullyQualifiedName,
      bareNameToFullyQualifiedNameMap,
    );

    const suggestion = this.#formatSimilarNameSuggestions(
      contractNameOrFullyQualifiedName,
      similarNames,
    );

    throw new HardhatError(HardhatError.ERRORS.ARTIFACTS.NOT_FOUND, {
      contractName: contractNameOrFullyQualifiedName,
      suggestion,
    });
  }

  #isFullyQualifiedName(name: string): boolean {
    return name.includes(":");
  }

  /**
   * Returs the expected path to the artifact given a fully qualified name.
   *
   * @param fullyQualifiedName The fully qualified name of the contract whose
   * artifact is being requested.
   * @returns The path to the artifact, which may or may not exist.
   */
  #getArtifactPathFromFullyQualifiedName(fullyQualifiedName: string): string {
    // TODO: Cache this?
    return (
      path.join(
        this.#artifactsPath,
        ...fullyQualifiedName.replace(":", "/").split("/"),
      ) + ".json"
    );
  }

  #getFullyQualifiedNameFromArtifactAbsolutePath(artifactPath: string): string {
    const relativePath = path.relative(this.#artifactsPath, artifactPath);
    const sourceName = path.dirname(relativePath).split(path.sep).join("/");
    const contractName = path.basename(relativePath, ".json");
    return `${sourceName}:${contractName}`;
  }

  #getSimilarContractNames(
    contractNameOrFullyQualifiedName: string,
    bareNameToFullyQualifiedNameMap: Map<string, ReadonlySet<string>>,
  ): string[] {
    const names = this.#isFullyQualifiedName(contractNameOrFullyQualifiedName)
      ? Array.from(bareNameToFullyQualifiedNameMap?.values() ?? [])
          .map((s) => [...s])
          .flat(1)
      : Array.from(bareNameToFullyQualifiedNameMap?.keys() ?? []);

    return names
      .map(
        (name) =>
          [name, editDistance(name, contractNameOrFullyQualifiedName)] as const,
      )
      .sort(([_, d1], [__, d2]) => d1 - d2)
      .filter(([_, d]) => d <= EDIT_DISTANCE_THRESHOLD)
      .map(([name]) => name);
  }

  #formatSimilarNameSuggestions(
    contractNameOrFullyQualifiedName: string,
    similarNames: string[],
  ): string {
    switch (similarNames.length) {
      case 0:
        return "";
      case 1:
        return `Did you mean "${similarNames[0]}"?`;
      default:
        return `We found some that were similar:

${similarNames.map((n) => `  * ${n}`).join(EOL)}

Please replace "${contractNameOrFullyQualifiedName}" for the correct contract name wherever you are trying to read its artifact.
`;
    }
  }

  async #getFsData(): Promise<FsData> {
    if (this.#fsData === undefined) {
      this.#fsData = await this.#readFsData();
    }

    return this.#fsData;
  }

  async #readFsDataFromFileSystem(): Promise<FsData> {
    const buildInfosDir = path.join(this.#artifactsPath, BUILD_INFO_DIR_NAME);

    const allArtifactPaths = await getAllFilesMatching(
      this.#artifactsPath,
      (p) => !p.startsWith(buildInfosDir) && p.endsWith(".json"),
    );

    const allFullyQualifiedNames = new Set<string>();
    const bareNameToFullyQualifiedNameMap = new Map<string, Set<string>>();

    for (const p of allArtifactPaths) {
      const bareName = path.basename(p, ".json");
      const fqn = this.#getFullyQualifiedNameFromArtifactAbsolutePath(p);
      allFullyQualifiedNames.add(fqn);

      const fqns = bareNameToFullyQualifiedNameMap.get(bareName);
      if (fqns === undefined) {
        bareNameToFullyQualifiedNameMap.set(bareName, new Set([fqn]));
      } else {
        fqns.add(fqn);
      }
    }

    return {
      allArtifactPaths: new Set(allArtifactPaths),
      bareNameToFullyQualifiedNameMap,
      allFullyQualifiedNames,
    };
  }
}

/**
 * Returns the edit-distance between two given strings using Levenshtein distance.
 *
 * @param a First string being compared
 * @param b Second string being compared
 * @returns distance between the two strings (lower number == more similar)
 * @see https://github.com/gustf/js-levenshtein
 * @license MIT - https://github.com/gustf/js-levenshtein/blob/master/LICENSE
 */
export function editDistance(a: string, b: string): number {
  function _min(
    _d0: number,
    _d1: number,
    _d2: number,
    _bx: number,
    _ay: number,
  ): number {
    return _d0 < _d1 || _d2 < _d1
      ? _d0 > _d2
        ? _d2 + 1
        : _d0 + 1
      : _bx === _ay
        ? _d1
        : _d1 + 1;
  }

  if (a === b) {
    return 0;
  }

  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  let la = a.length;
  let lb = b.length;

  while (la > 0 && a.charCodeAt(la - 1) === b.charCodeAt(lb - 1)) {
    la--;
    lb--;
  }

  let offset = 0;

  while (offset < la && a.charCodeAt(offset) === b.charCodeAt(offset)) {
    offset++;
  }

  la -= offset;
  lb -= offset;

  if (la === 0 || lb < 3) {
    return lb;
  }

  let x = 0;
  let y: number;
  let d0: number;
  let d1: number;
  let d2: number;
  let d3: number;
  let dd: number = 0; // typescript gets angry if we don't assign here
  let dy: number;
  let ay: number;
  let bx0: number;
  let bx1: number;
  let bx2: number;
  let bx3: number;

  const vector = [];

  for (y = 0; y < la; y++) {
    vector.push(y + 1);
    vector.push(a.charCodeAt(offset + y));
  }

  const len = vector.length - 1;

  for (; x < lb - 3; ) {
    bx0 = b.charCodeAt(offset + (d0 = x));
    bx1 = b.charCodeAt(offset + (d1 = x + 1));
    bx2 = b.charCodeAt(offset + (d2 = x + 2));
    bx3 = b.charCodeAt(offset + (d3 = x + 3));
    dd = x += 4;
    for (y = 0; y < len; y += 2) {
      dy = vector[y];
      ay = vector[y + 1];
      d0 = _min(dy, d0, d1, bx0, ay);
      d1 = _min(d0, d1, d2, bx1, ay);
      d2 = _min(d1, d2, d3, bx2, ay);
      dd = _min(d2, d3, dd, bx3, ay);
      vector[y] = dd;
      d3 = d2;
      d2 = d1;
      d1 = d0;
      d0 = dy;
    }
  }

  for (; x < lb; ) {
    bx0 = b.charCodeAt(offset + (d0 = x));
    dd = ++x;
    for (y = 0; y < len; y += 2) {
      dy = vector[y];
      vector[y] = dd = _min(dy, d0, dd, bx0, vector[y + 1]);
      d0 = dy;
    }
  }

  return dd;
}
