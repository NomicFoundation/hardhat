import type {
  ArtifactsManager,
  GetAtifactByName,
} from "../../../types/artifacts.js";

import path from "node:path";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  exists,
  getAllFilesMatching,
  readJsonFile,
} from "@ignored/hardhat-vnext-utils/fs";

export const BUILD_INFO_DIR_NAME = "build-info";

export class ArticlesManagerImplementation implements ArtifactsManager {
  readonly #artifactsPath: string;

  // We cache the map of bare names to fully qualified names to avoid
  // having to traverse the filesystem every time we need to get the
  // fully qualified name of a contract.
  readonly #bareNameToFullyQualifiedNameMap?: Map<string, string[]>;

  // We also cache the list of artifact paths to make sure that we return a
  // consistent result with respect to the #bareNameToFullyQualifiedNameMap.
  #allArtifactPaths?: string[];

  constructor(artifactsPath: string) {
    this.#artifactsPath = artifactsPath;
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
    return exists(await this.getArtifactPath(contractNameOrFullyQualifiedName));
  }

  public async getBuildInfoId(
    fullyQualifiedName: string,
  ): Promise<string | undefined> {
    const artifact = await this.readArtifact(fullyQualifiedName);

    return artifact.buildInfoId;
  }

  public async getAllFullyQualifiedNames(): Promise<string[]> {
    const allArtifactPaths = await this.#getAllArtifactAbsolutePaths();
    return allArtifactPaths.map((p) =>
      this.#getFullyQualifiedNameFromArtifactAbsolutePath(p),
    );
  }

  public async getBuildInfoIds(): Promise<string[]> {
    const paths = await getAllFilesMatching(
      path.join(this.#artifactsPath, BUILD_INFO_DIR_NAME),
      (p) => p.endsWith(".json") && !p.endsWith(".output.json"),
    );

    return paths.map((p) => path.basename(p, ".json"));
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

  async #getAllArtifactAbsolutePaths(): Promise<string[]> {
    if (this.#allArtifactPaths === undefined) {
      const buildInfosDir = path.join(this.#artifactsPath, BUILD_INFO_DIR_NAME);

      this.#allArtifactPaths = await getAllFilesMatching(
        this.#artifactsPath,
        (p) =>
          !p.startsWith(buildInfosDir) &&
          p.endsWith(".json") &&
          !p.includes(".sol" + path.sep),
      );
    }

    return this.#allArtifactPaths;
  }

  async #getFullyQualifiedName(
    contractNameOrFullyQualifiedName: string,
  ): Promise<string> {
    if (this.#isFullyQualifiedName(contractNameOrFullyQualifiedName)) {
      return contractNameOrFullyQualifiedName;
    }

    const fqnMap = await this.#getBareNameToFullyQualifiedNameMap();

    const fqns = fqnMap.get(contractNameOrFullyQualifiedName);

    if (fqns === undefined) {
      // TODO: Throw the right error, suggesting similar names
      throw new HardhatError(
        HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR,
        {
          message: "Artifact doesn't exist — Error not implemented yet",
        },
      );
    }

    if (fqns.length !== 1) {
      // TODO: Throw the right error, suggesting the FQNs
      throw new HardhatError(
        HardhatError.ERRORS.INTERNAL.NOT_IMPLEMENTED_ERROR,
        {
          message:
            "Artifact bare name is ambiguous — Error not implemented yet",
        },
      );
    }

    return fqns[1];
  }

  async #getBareNameToFullyQualifiedNameMap(): Promise<Map<string, string[]>> {
    if (this.#bareNameToFullyQualifiedNameMap !== undefined) {
      return this.#bareNameToFullyQualifiedNameMap;
    }

    const paths = await this.#getAllArtifactAbsolutePaths();

    const fqnMap = new Map<string, string[]>();

    for (const p of paths) {
      const bareName = path.basename(p, ".json");
      const fqn = this.#getFullyQualifiedNameFromArtifactAbsolutePath(p);

      const fqns = fqnMap.get(bareName);
      if (fqns === undefined) {
        fqnMap.set(bareName, [fqn]);
      } else {
        fqns.push(fqn);
      }
    }

    return fqnMap;
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
}
