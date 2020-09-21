import { ResolvedFile } from "../internal/solidity/resolver";
import { SolcConfig } from "../types";

/**
 * A CompilationJob includes all the necessary information to generate artifacts
 * from a group of files. This includes those files, their dependencies, and the
 * version and configuration of solc that should be used.
 */
export interface CompilationJob {
  emitsArtifacts(file: ResolvedFile): boolean;
  hasSolc9573Bug(): boolean;
  merge(other: CompilationJob): CompilationJob;
  getResolvedFiles(): ResolvedFile[];
  getSolcConfig(): SolcConfig;
}

/**
 * A DependencyGraph represents a group of files and how they depend on each
 * other.
 */
export interface DependencyGraph {
  getConnectedComponents(): DependencyGraph[];
  getDependencies(file: ResolvedFile): ResolvedFile[];
  getResolvedFiles(): ResolvedFile[];
  getTransitiveDependencies(file: ResolvedFile): ResolvedFile[];
}

/**
 * An object with a list of successfully created compilation jobs and a list of
 * errors. The `errors` entry maps error codes (that come from the
 * CompilationJobCreationError enum) to the source names of the files that
 * caused that error.
 */
export interface CompilationJobsCreationResult {
  jobs: CompilationJob[];
  errors: CompilationJobsCreationErrors;
}

export type CompilationJobsCreationErrors = {
  [error in CompilationJobCreationError]?: string[];
};

export enum CompilationJobCreationError {
  OTHER_ERROR = "other",
  NO_COMPATIBLE_SOLC_VERSION_FOUND = "no-compatible-solc-version-found",
  INCOMPATIBLE_OVERRIDEN_SOLC_VERSION = "incompatible-overriden-solc-version",
  IMPORTS_INCOMPATIBLE_FILE = "imports-incompatible-file",
}
