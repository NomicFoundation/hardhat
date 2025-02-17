import type { DependencyGraph } from "../../../../types/solidity/dependency-graph.js";
import type { ResolvedFile } from "../../../../types/solidity/resolved-file.js";

import { assertHardhatInvariant } from "@ignored/hardhat-vnext-errors";

export class DependencyGraphImplementation implements DependencyGraph {
  readonly #fileBySourceName = new Map<string, ResolvedFile>();
  readonly #rootByPublicSourceName = new Map<string, ResolvedFile>();
  readonly #dependencies = new Map<ResolvedFile, Set<ResolvedFile>>();

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
   */
  public addDependency(from: ResolvedFile, to: ResolvedFile): void {
    const dependencies = this.#dependencies.get(from);
    assertHardhatInvariant(
      dependencies !== undefined,
      "File `from` from not present",
    );

    if (!this.hasFile(to)) {
      this.#addFile(to);
    }

    dependencies.add(to);
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
    return this.#dependencies.keys();
  }

  public hasFile(file: ResolvedFile): boolean {
    return this.#dependencies.has(file);
  }

  public getDependencies(file: ResolvedFile): ReadonlySet<ResolvedFile> {
    return this.#dependencies.get(file) ?? new Set();
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
        if (!subgraph.hasFile(dependency)) {
          filesToTraverse.push(dependency);
        }

        subgraph.addDependency(fileToAnalyze, dependency);
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
      merged.addRootFile(publicSourceName, root);
    }

    for (const [from, toes] of this.#dependencies) {
      for (const to of toes) {
        merged.addDependency(from, to);
      }
    }

    for (const [from, toes] of other.#dependencies) {
      for (const to of toes) {
        merged.addDependency(from, to);
      }
    }

    return merged;
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
    this.#dependencies.set(file, new Set());
  }
}
