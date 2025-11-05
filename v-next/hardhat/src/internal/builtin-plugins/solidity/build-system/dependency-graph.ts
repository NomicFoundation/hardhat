import type { DependencyGraph } from "../../../../types/solidity/dependency-graph.js";
import type { ResolvedFile } from "../../../../types/solidity/resolved-file.js";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

export interface DependencyGraphImplementationJson {
  readonly fileByInputSourceName: Record<string, ResolvedFile>;
  readonly rootByUserSourceName: Record<
    string /* user source name */,
    string /* input source name */
  >;
  readonly dependencies: Record<
    string /* from input source name */,
    Record<string /* to input source name */, string[] /* remappings */>
  >;
}

export class DependencyGraphImplementation implements DependencyGraph {
  readonly #fileByInputSourceName = new Map<string, ResolvedFile>();
  readonly #rootByUserSourceName = new Map<string, ResolvedFile>();
  readonly #dependenciesMap = new Map<
    ResolvedFile,
    Map<ResolvedFile, Set<string>>
  >();

  /**
   * Adds a root file to the graph. All the roots of the dependency graph must
   * be added before any dependencry.
   *
   * @param userSourceName The source name used to identify the file, as it
   * would appear in the artifacts and used by the user. This is not always the
   * same as the source name used by solc, as it differs when an npm file is
   * acting as a root.
   * @param root The root file.
   */
  public addRootFile(userSourceName: string, root: ResolvedFile): void {
    this.#addFile(root);
    this.#rootByUserSourceName.set(userSourceName, root);
  }

  /**
   * Adds a dependency from a file to another one.
   *
   * @param from The file that depends on another one, which must be already
   *  present in the graph.
   * @param to The dependency, which will be added to the list of dependencies
   *  of the file, and added to the graph if needed.
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
   * Returns a map of user source names to root files.
   */
  public getRoots(): ReadonlyMap<string, ResolvedFile> {
    return this.#rootByUserSourceName;
  }

  /**
   * Returns an sorted map of userSourceName to inputSourceName for every
   * root of the graph.
   */
  public getRootsUserSourceNameMap(): Record<string, string> {
    return Object.fromEntries(
      [...this.getRoots().entries()]
        .map(([userSourceName, root]) => [userSourceName, root.inputSourceName])
        .sort(([p1, p2]) => p1.localeCompare(p2)),
    );
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

  public getFileByInputSourceName(
    inputSourceName: string,
  ): ResolvedFile | undefined {
    return this.#fileByInputSourceName.get(inputSourceName);
  }

  public getSubgraph(
    ...rootUserSourceNames: string[]
  ): DependencyGraphImplementation {
    const subgraph = new DependencyGraphImplementation();

    const filesToTraverse: ResolvedFile[] = [];

    for (const rootUserSourceName of rootUserSourceNames) {
      const root = this.#rootByUserSourceName.get(rootUserSourceName);

      assertHardhatInvariant(
        root !== undefined,
        "We should have a root for every root user source name",
      );

      subgraph.addRootFile(rootUserSourceName, root);
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

    for (const [userSourceName, root] of this.#rootByUserSourceName) {
      merged.addRootFile(userSourceName, root);
    }

    for (const [userSourceName, root] of other.#rootByUserSourceName) {
      if (merged.hasFile(root)) {
        continue;
      }
      merged.addRootFile(userSourceName, root);
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
      fileByInputSourceName: Object.fromEntries(this.#fileByInputSourceName),
      rootByUserSourceName: Object.fromEntries(
        this.#rootByUserSourceName
          .entries()
          .map(([userSourceName, file]) => [
            userSourceName,
            file.inputSourceName,
          ]),
      ),
      dependencies: Object.fromEntries(
        this.#dependenciesMap
          .entries()
          .map(([from, dependencies]) => [
            from.inputSourceName,
            Object.fromEntries(
              dependencies
                .entries()
                .map(([to, remappings]) => [
                  to.inputSourceName,
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
      `File ${file.inputSourceName} already present`,
    );

    assertHardhatInvariant(
      this.#fileByInputSourceName.get(file.inputSourceName) === undefined,
      `File "${file.inputSourceName}" already present`,
    );

    this.#fileByInputSourceName.set(file.inputSourceName, file);
    this.#dependenciesMap.set(file, new Map());
  }
}
