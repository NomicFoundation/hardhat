import type { DependencyGraph } from "../../../../types/solidity/dependency-graph.js";
import type { ResolvedFile } from "../../../../types/solidity/resolved-file.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

export interface DependencyGraphImplementationJson {
  readonly fileBySourceName: Record<string, ResolvedFile>;
  readonly rootByPublicSourceName: Record<
    string /* public source name */,
    string /* actual source name */
  >;
  readonly dependencies: Record<
    string /* from source name */,
    Record<string /* to source name */, string[] /* remappings */>
  >;
}

export class DependencyGraphImplementation implements DependencyGraph {
  readonly #fileBySourceName = new Map<string, ResolvedFile>();
  readonly #rootByPublicSourceName = new Map<string, ResolvedFile>();
  readonly #dependenciesMap = new Map<
    ResolvedFile,
    Map<ResolvedFile, Set<string>>
  >();

  /**
   * Adds a root file to the graph. All the roots of the dependency graph must
   * be added before any dependencry.
   *
   * @param publicSourceName The source name used to identify the file, as it
   * would appear in the artifacts and used by the user. This is not always the
   * same as the source name used by solc, as it differs when an npm file is
   * acting as a root.
   * @param root The root file.
   */
  public addRootFile(publicSourceName: string, root: ResolvedFile): void {
    this.#addFile(root);
    this.#rootByPublicSourceName.set(publicSourceName, root);
  }

  /**
   * Adds a dependency from a file to another one.
   *
   * @param from The file that depends on another one, which must be already
   *  present in the graph.
   * @param to The dependency, which will be added to the list of dependencies
   *  of the file, and addded to the graph if needed.
   * @param remapping The remapping that was used to resolve this dependency, if
   *  any.
   */
  public addDependency(
    from: ResolvedFile,
    to: ResolvedFile,
    remapping?: string,
  ): void {
    const dependencies = this.#dependenciesMap.get(from);
    assertHardhatInvariant(
      dependencies !== undefined,
      "File `from` from not present",
    );

    if (!this.hasFile(to)) {
      this.#addFile(to);
    }

    let edgeRemappings = dependencies.get(to);
    if (edgeRemappings === undefined) {
      edgeRemappings = new Set();
      dependencies.set(to, edgeRemappings);
    }

    if (remapping !== undefined) {
      edgeRemappings.add(remapping);
    }
  }

  /**
   * Returns a map of public source names to root files.
   */
  public getRoots(): ReadonlyMap<string, ResolvedFile> {
    return this.#rootByPublicSourceName;
  }

  /**
   * Returns a set of all the files in the graph.
   */
  public getAllFiles(): Iterable<ResolvedFile> {
    return this.#dependenciesMap.keys();
  }

  public hasFile(file: ResolvedFile): boolean {
    return this.#dependenciesMap.has(file);
  }

  public getDependencies(file: ResolvedFile): ReadonlySet<{
    file: ResolvedFile;
    remappings: ReadonlySet<string>;
  }> {
    const dependencies = this.#dependenciesMap.get(file);
    if (dependencies === undefined) {
      return new Set();
    }

    return new Set(
      Array.from(dependencies.entries()).map(([to, remappings]) => ({
        file: to,
        remappings,
      })),
    );
  }

  public getFileBySourceName(sourceName: string): ResolvedFile | undefined {
    return this.#fileBySourceName.get(sourceName);
  }

  public getSubgraph(
    ...rootPublicSourceNames: string[]
  ): DependencyGraphImplementation {
    const subgraph = new DependencyGraphImplementation();

    const filesToTraverse: ResolvedFile[] = [];

    for (const rootPublicSourceName of rootPublicSourceNames) {
      const root = this.#rootByPublicSourceName.get(rootPublicSourceName);

      assertHardhatInvariant(
        root !== undefined,
        "We should have a root for every root public source name",
      );

      subgraph.addRootFile(rootPublicSourceName, root);
      filesToTraverse.push(root);
    }

    let fileToAnalyze;
    while ((fileToAnalyze = filesToTraverse.pop()) !== undefined) {
      for (const dependency of this.getDependencies(fileToAnalyze)) {
        if (!subgraph.hasFile(dependency.file)) {
          filesToTraverse.push(dependency.file);
        }

        subgraph.addDependency(fileToAnalyze, dependency.file);
        for (const remapping of dependency.remappings) {
          subgraph.addDependency(fileToAnalyze, dependency.file, remapping);
        }
      }
    }

    return subgraph;
  }

  public merge(
    other: DependencyGraphImplementation,
  ): DependencyGraphImplementation {
    const merged = new DependencyGraphImplementation();

    for (const [publicSourceName, root] of this.#rootByPublicSourceName) {
      merged.addRootFile(publicSourceName, root);
    }

    for (const [publicSourceName, root] of other.#rootByPublicSourceName) {
      if (merged.hasFile(root)) {
        continue;
      }
      merged.addRootFile(publicSourceName, root);
    }

    for (const [from, dependencies] of this.#dependenciesMap) {
      for (const [to, remappings] of dependencies) {
        merged.addDependency(from, to);

        for (const remapping of remappings) {
          merged.addDependency(from, to, remapping);
        }
      }
    }

    for (const [from, dependencies] of other.#dependenciesMap) {
      for (const [to, remappings] of dependencies) {
        merged.addDependency(from, to);

        for (const remapping of remappings) {
          merged.addDependency(from, to, remapping);
        }
      }
    }

    return merged;
  }

  public getAllRemappings(): readonly string[] {
    return this.#dependenciesMap
      .values()
      .flatMap((dependencies) =>
        dependencies.values().flatMap((remappings) => remappings.values()),
      )
      .toArray()
      .sort();
  }

  public toJSON(): DependencyGraphImplementationJson {
    return {
      fileBySourceName: Object.fromEntries(this.#fileBySourceName),
      rootByPublicSourceName: Object.fromEntries(
        this.#rootByPublicSourceName
          .entries()
          .map(([publicSourceName, file]) => [
            publicSourceName,
            file.sourceName,
          ]),
      ),
      dependencies: Object.fromEntries(
        this.#dependenciesMap
          .entries()
          .map(([from, dependencies]) => [
            from.sourceName,
            Object.fromEntries(
              dependencies
                .entries()
                .map(([to, remappings]) => [
                  to.sourceName,
                  [...remappings].sort(),
                ]),
            ),
          ]),
      ),
    };
  }

  #addFile(file: ResolvedFile): void {
    assertHardhatInvariant(
      !this.hasFile(file),
      `File ${file.sourceName} already present`,
    );

    assertHardhatInvariant(
      this.#fileBySourceName.get(file.sourceName) === undefined,
      `File "${file.sourceName}" already present`,
    );

    this.#fileBySourceName.set(file.sourceName, file);
    this.#dependenciesMap.set(file, new Map());
  }
}
