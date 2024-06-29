import type { ResolvedFile, Resolver } from "./resolver.js";
import type * as taskTypes from "../types/builtin-tasks/index.js";

import {
  HardhatError,
  assertHardhatInvariant,
} from "@ignored/hardhat-vnext-errors";

import { ERRORS } from "../error-descriptors.js";

export class DependencyGraph implements taskTypes.DependencyGraph {
  public static async createFromResolvedFiles(
    resolver: Resolver,
    resolvedFiles: ResolvedFile[],
  ): Promise<DependencyGraph> {
    const graph = new DependencyGraph();

    // TODO refactor this to make the results deterministic
    await Promise.all(
      resolvedFiles.map((resolvedFile) =>
        graph.#addDependenciesFrom(resolver, resolvedFile),
      ),
    );

    return graph;
  }

  readonly #resolvedFiles = new Map<string, ResolvedFile>();
  readonly #dependenciesPerFile = new Map<string, Set<ResolvedFile>>();

  // map absolute paths to source names
  readonly #visitedFiles = new Map<string, string>();

  private constructor() {}

  public getResolvedFiles(): ResolvedFile[] {
    return Array.from(this.#resolvedFiles.values());
  }

  public has(file: ResolvedFile): boolean {
    return this.#resolvedFiles.has(file.sourceName);
  }

  public isEmpty(): boolean {
    return this.#resolvedFiles.size === 0;
  }

  public entries(): Array<[ResolvedFile, Set<ResolvedFile>]> {
    return Array.from(this.#dependenciesPerFile.entries()).map(
      ([key, value]) => {
        const resolvedFile = this.#resolvedFiles.get(key);

        assertHardhatInvariant(
          resolvedFile !== undefined,
          "The resolved file is undefined",
        );

        return [resolvedFile, value];
      },
    );
  }

  public getDependencies(file: ResolvedFile): ResolvedFile[] {
    const dependencies =
      this.#dependenciesPerFile.get(file.sourceName) ?? new Set();

    return [...dependencies];
  }

  public getTransitiveDependencies(
    file: ResolvedFile,
  ): taskTypes.TransitiveDependency[] {
    const visited = new Set<ResolvedFile>();

    const transitiveDependencies = this.#getTransitiveDependencies(
      file,
      visited,
      [],
    );

    return [...transitiveDependencies];
  }

  public getConnectedComponents(): DependencyGraph[] {
    const undirectedGraph: Record<string, Set<string>> = {};

    for (const [
      sourceName,
      dependencies,
    ] of this.#dependenciesPerFile.entries()) {
      undirectedGraph[sourceName] = undirectedGraph[sourceName] ?? new Set();

      for (const dependency of dependencies) {
        undirectedGraph[dependency.sourceName] =
          undirectedGraph[dependency.sourceName] ?? new Set();

        undirectedGraph[sourceName]?.add(dependency.sourceName);
        undirectedGraph[dependency.sourceName]?.add(sourceName);
      }
    }

    const components: Array<Set<string>> = [];
    const visited = new Set<string>();

    for (const node of Object.keys(undirectedGraph)) {
      if (visited.has(node)) {
        continue;
      }

      visited.add(node);

      const component = new Set([node]);
      const stack = [...(undirectedGraph[node] ?? [])];
      while (stack.length > 0) {
        const newNode = stack.pop();

        assertHardhatInvariant(newNode !== undefined, "The node is undefined");

        if (visited.has(newNode)) {
          continue;
        }

        visited.add(newNode);
        component.add(newNode);

        [...(undirectedGraph[newNode] ?? [])].forEach((adjacent) => {
          if (!visited.has(adjacent)) {
            stack.push(adjacent);
          }
        });
      }

      components.push(component);
    }

    const connectedComponents: DependencyGraph[] = [];
    for (const component of components) {
      const dependencyGraph = new DependencyGraph();

      for (const sourceName of component) {
        const file = this.#resolvedFiles.get(sourceName);
        const dependencies = this.#dependenciesPerFile.get(sourceName);

        assertHardhatInvariant(file !== undefined, "File is undefined");
        assertHardhatInvariant(
          dependencies !== undefined,
          "Dependencies set is undefined",
        );

        dependencyGraph.#resolvedFiles.set(sourceName, file);
        dependencyGraph.#dependenciesPerFile.set(sourceName, dependencies);
      }
      connectedComponents.push(dependencyGraph);
    }

    return connectedComponents;
  }

  #getTransitiveDependencies(
    file: ResolvedFile,
    visited: Set<ResolvedFile>,
    path: ResolvedFile[],
  ): Set<taskTypes.TransitiveDependency> {
    if (visited.has(file)) {
      return new Set();
    }
    visited.add(file);

    const directDependencies: taskTypes.TransitiveDependency[] =
      this.getDependencies(file).map((dependency) => ({
        dependency,
        path,
      }));

    const transitiveDependencies = new Set<taskTypes.TransitiveDependency>(
      directDependencies,
    );

    for (const { dependency } of transitiveDependencies) {
      this.#getTransitiveDependencies(
        dependency,
        visited,
        path.concat(dependency),
      ).forEach((x) => transitiveDependencies.add(x));
    }

    return transitiveDependencies;
  }

  async #addDependenciesFrom(
    resolver: Resolver,
    file: ResolvedFile,
  ): Promise<void> {
    const sourceName = this.#visitedFiles.get(file.absolutePath);

    if (sourceName !== undefined) {
      if (sourceName !== file.sourceName) {
        throw new HardhatError(ERRORS.RESOLVER.AMBIGUOUS_SOURCE_NAMES, {
          sourcenames: `'${sourceName}' and '${file.sourceName}'`,
          file: file.absolutePath,
        });
      }

      return;
    }

    this.#visitedFiles.set(file.absolutePath, file.sourceName);

    const dependencies = new Set<ResolvedFile>();
    this.#resolvedFiles.set(file.sourceName, file);
    this.#dependenciesPerFile.set(file.sourceName, dependencies);

    // TODO refactor this to make the results deterministic
    await Promise.all(
      file.content.imports.map(async (imp) => {
        const dependency = await resolver.resolveImport(file, imp);
        dependencies.add(dependency);

        await this.#addDependenciesFrom(resolver, dependency);
      }),
    );
  }
}
