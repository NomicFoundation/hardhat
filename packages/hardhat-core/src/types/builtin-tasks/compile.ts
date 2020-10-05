import { SolcConfig } from "../config";

/**
 * A Solidity file.
 */
export interface ResolvedFile {
  library?: LibraryInfo;
  sourceName: string;
  absolutePath: string;
  content: FileContent;
  // IMPORTANT: Mapped to ctime, NOT mtime. mtime isn't updated when the file
  // properties (e.g. its name) are changed, only when it's content changes.
  lastModificationDate: Date;
  getVersionedName(): string;
}

/**
 * Information about an npm library.
 */
export interface LibraryInfo {
  name: string;
  version: string;
}

/**
 * The content of a Solidity file. Including its raw content, its imports and
 * version pragma directives.
 */
export interface FileContent {
  rawContent: string;
  imports: string[];
  versionPragmas: string[];
}

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

export interface SolcBuild {
  version: string;
  longVersion: string;
  compilerPath: string;
  isSolcJs: boolean;
}
