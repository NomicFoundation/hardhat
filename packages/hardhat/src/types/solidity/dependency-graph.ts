import type { ResolvedFile } from "./resolved-file.js";

/**
 * A Solidity dependency graph.
 */
export interface DependencyGraph {
  /**
   * Gets a map of user source names to root files.
   */
  getRoots(): ReadonlyMap<string, ResolvedFile>;

  /**
   * Returns a sorted map of userSourceName to inputSourceName for every
   * root of the graph.
   */
  getRootsUserSourceNameMap(): Record<string, string>;

  /**
   * Returns an iterable with all the files.
   */
  getAllFiles(): Iterable<ResolvedFile>;

  /**
   * Returns true if the graph contains the given file.
   */
  hasFile(file: ResolvedFile): boolean;

  /**
   * Returns the set of dependencies of the given file.
   *
   * @param file The file to get the dependencies of. It must be present in the
   * graph.
   */
  getDependencies(file: ResolvedFile): ReadonlySet<{
    file: ResolvedFile;
    remappings: ReadonlySet<string>;
  }>;

  /**
   * Returns a file by its input source name, if present.
   *
   * @param inputSourceName The source name of the file, as used in the solc input.
   * @returns The file, if present. If found, `file.inputSourceName` is equal to
   * `inputSourceName`.
   */
  getFileByInputSourceName(inputSourceName: string): ResolvedFile | undefined;

  /**
   * Returns a subgraph of the graph, containing only the given root files and
   * their transitive dependencies.
   *
   * @param rootUserSourceNames The user source names of the roots of the
   * subgraph. They must be present in the graph.
   */
  getSubgraph(...rootUserSourceNames: string[]): DependencyGraph;

  /**
   * A method to merge two dependency graphs. The resulting graph will have all
   * the files of both graphs, with all the dependencies of the files in both
   * graphs, and the roots of both graphs as root.
   *
   * @param other The other DependencyGraph to merge with, which MUST have been
   * created with the same Resolver.
   */
  merge(other: DependencyGraph): DependencyGraph;

  /**
   * Returns a set with all the remappings that are present in the graph.
   */
  getAllRemappings(): readonly string[];
}
