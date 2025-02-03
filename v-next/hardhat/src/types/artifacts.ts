import type { SolidityBuildInfo } from "./solidity/solidity-artifacts.js";

/**
 * A map of bare contract names and fully qualified contract names to their
 * artifacts that will be completed by Hardhat's build system using module
 * augmentation.
 */
/* eslint-disable-next-line @typescript-eslint/no-empty-interface -- This will
be populated by module augmentation */
export interface ArtifactMap {}

/**
 * Returns the artifact type for the bare or fully qualified contract name.
 */
export type GetAtifactByName<ContractNameT extends string> =
  ContractNameT extends keyof ArtifactMap
    ? ArtifactMap[ContractNameT]
    : Artifact;

/**
 * The ArtifactManager is responsible for reading and writing artifacts from
 * the Hardhat build system.
 */
export interface ArtifactManager {
  /**
   * Reads an artifact.
   *
   * @param contractNameOrFullyQualifiedName The name of the contract.
   *   It can be a contract bare contract name (e.g. "Token") if it's
   *   unique in your project, or a fully qualified contract name
   *   (e.g. "contract/token.sol:Token") otherwise.
   *
   * @throws Throws an error if a non-unique contract name is used,
   *   indicating which fully qualified names can be used instead.
   * @throws Throws an error if the artifact doesn't exist.
   */
  readArtifact<ContractNameT extends string>(
    contractNameOrFullyQualifiedName: ContractNameT,
  ): Promise<GetAtifactByName<ContractNameT>>;

  /**
   * Returns the absolute path to the given artifact.
   *
   * @param contractNameOrFullyQualifiedName The name or fully qualified name
   * of the contract.
   * @throws Throws an error if a non-unique contract name is used,
   *   indicating which fully qualified names can be used instead.
   * @throws Throws an error if the artifact doesn't exist.
   */
  getArtifactPath(contractNameOrFullyQualifiedName: string): Promise<string>;

  /**
   * Returns true if an artifact exists.
   *
   * This function doesn't throw if the name is not unique.
   *
   * @param contractNameOrFullyQualifiedName Contract or fully qualified name.\
   * @throws Throws an error if a non-unique contract name is used,
   *   indicating which fully qualified names can be used instead.
   */
  artifactExists(contractNameOrFullyQualifiedName: string): Promise<boolean>;

  /**
   * Returns a set with the fully qualified names of all the artifacts.
   */
  getAllFullyQualifiedNames(): Promise<ReadonlySet<string>>;

  /**
   * Returns the BuildInfo id associated with the solc run that compiled a
   * contract.
   *
   * Note that it may return `undefined` if the artifact doesn't have a build
   * id, which can happen if the artifact wasn't compiled with Hardhat 3's build
   * system.
   *
   * If it it does return an id, it's not guaranteed that the build info is
   * present.
   *
   * @param contractNameOrFullyQualifiedName Contract or fully qualified name, whose artifact must exist.
   * @throws Throws an error if a non-unique contract name is used,
   *   indicating which fully qualified names can be used instead.
   * @throws Throws an error if the artifact doesn't exist.
   * @returns The build info id, or undefined if the artifact doesn't have a
   *   build info id.
   */
  getBuildInfoId(
    contractNameOrFullyQualifiedName: string,
  ): Promise<string | undefined>;

  /**
   * Returns an set with the ids of all the existing build infos.
   *
   * Note that there's one build info per run of solc, so they can be shared
   * by different contracts.
   */
  getAllBuildInfoIds(): Promise<ReadonlySet<string>>;

  /**
   * Returns the absolute path to the given build info, or undefined if it
   * doesn't exist.
   *
   * @param buildInfoId The id of an existing build info.
   */
  getBuildInfoPath(buildInfoId: string): Promise<string | undefined>;

  /**
   * Returns the absolute path to the output of the given build info,
   * if present.
   *
   * Note that the build info may exist, but it's output may not.
   *
   * @param buildInfoId The id of an existing build info.
   */
  getBuildInfoOutputPath(buildInfoId: string): Promise<string | undefined>;

  /**
   * An artifact manager may cache information about the artifacts present in
   * the project, for performance reasons. For example, it may read the entire
   * list of artifacts from the file system, and cache it in memory.
   *
   * This method clears the artifact manager's cache, if any.
   *
   * This method is not meant to be used by end users, but by the Hardhat team
   * and build-system-related plugins.
   */
  clearCache(): Promise<void>;
}

/**
 * TODO: This type could be improved to better represent the ABI.
 */
export type Abi = readonly any[];

/**
 * An Artifact represents the compilation output of a single contract.
 *
 * This file has just enough information to deploy the contract and interact
 * with an already deployed instance of it.
 */
export interface Artifact<AbiT extends Abi = Abi> {
  /**
   * The version identifier of this format.
   */
  readonly _format: "hh3-artifact-1";

  /**
   * The bare name of the contract (i.e. without the source name).
   */
  readonly contractName: string;

  /**
   * The name of the file where the contract is defined.
   *
   * When Hardhat generates artifacts, it uses the following logic to determine
   * the source name:
   *   - The relative path from the root of the project, if the contract is
   *     defined in a file in the project.
   *   - The npm module identifier (i.e. `<package>/<file>`) if the contract
   *     is defined in a file in a npm package.
   *   - This may or may not be the same as the source name used by `solc`.
   *     For that information, see `inputSourceName`.
   *
   * This source name is used to determine the path to the artifact, and to
   * generate its fully qualified name.
   */
  readonly sourceName: string;

  /**
   * The ABI of the contract.
   */
  readonly abi: AbiT;

  /**
   * The bytecode used to deploy the contract.
   */
  readonly bytecode: string; // "0x"-prefixed hex string

  /**
   * The link references of the deployment bytecode.
   */
  readonly linkReferences: LinkReferences;

  /**
   * The deployed or runtime bytecode of the contract.
   */
  readonly deployedBytecode: string; // "0x"-prefixed hex string

  /**
   * The link references of the deployed bytecode.
   */
  readonly deployedLinkReferences: LinkReferences;

  /**
   * The references to the immutable variables that get embedded in the deployed
   * bytecode.
   */
  readonly immutableReferences?: ImmutableReferences;

  /**
   * The id of the build info that was used to generate this artifact.
   *
   * This may not be present if the artifact wasn't generated by Hardhat's build
   * system.
   */
  readonly buildInfoId?: string;

  /**
   * The source name of the file in the build info's source map that has this
   * contract's code.
   *
   * This can be different from the source name of the artifact, when the file
   * comes from an npm package.
   */
  readonly inputSourceName?: string;
}

/**
 * The link references of a contract, which need to be resolved before using it.
 */
export interface LinkReferences {
  [librarySourceName: string]: {
    [libraryName: string]: Array<{ length: number; start: number }>;
  };
}

/**
 * The references to the immutable variables that get embedded in the deployed
 * bytecode.
 *
 * Each immutable variable is represented by an id, which in the case of solc
 * is the id of the AST node that represents the variable.
 */
export interface ImmutableReferences {
  [immuatableId: string]: Array<{ start: number; length: number }>;
}

/**
 * A BuildInfo is a file containing all the information to reproduce a build.
 *
 * Note that currently, BuildInfos are only generated for Solidity contracts,
 * and this will change once we add support for Vyper, so if you are using this,
 * keep in mind that you will need to update your code to support or ignore
 * Vyper's artifacts.
 */
export type BuildInfo = SolidityBuildInfo;
