import * as taskTypes from "../../types/builtin-tasks";

import { ResolvedFile, Resolver } from "./resolver";

export class DependencyGraph implements taskTypes.DependencyGraph {
  public static async createFromResolvedFiles(
    resolver: Resolver,
    resolvedFiles: ResolvedFile[]
  ): Promise<DependencyGraph> {
    const graph = new DependencyGraph();

    await Promise.all(
      resolvedFiles.map((resolvedFile) =>
        graph._addDependenciesFrom(resolver, resolvedFile)
      )
    );

    return graph;
  }

  private _resolvedFiles = new Map<string, ResolvedFile>();
  private _dependenciesPerFile = new Map<string, Set<ResolvedFile>>();

  private readonly _visitedFiles = new Set<string>();

  private constructor() {}

  public getResolvedFiles(): ResolvedFile[] {
    return Array.from(this._resolvedFiles.values());
  }

  public has(file: ResolvedFile): boolean {
    return this._resolvedFiles.has(file.sourceName);
  }

  public isEmpty(): boolean {
    return this._resolvedFiles.size === 0;
  }

  public entries(): Array<[ResolvedFile, Set<ResolvedFile>]> {
    return Array.from(this._dependenciesPerFile.entries()).map(
      ([key, value]) => [this._resolvedFiles.get(key)!, value]
    );
  }

  public getDependencies(file: ResolvedFile): ResolvedFile[] {
    const dependencies =
      this._dependenciesPerFile.get(file.sourceName) ?? new Set();

    return [...dependencies];
  }

  public getTransitiveDependencies(
    file: ResolvedFile
  ): taskTypes.TransitiveDependency[] {
    const visited = new Set<ResolvedFile>();

    const transitiveDependencies = this._getTransitiveDependencies(
      file,
      visited,
      []
    );

    return [...transitiveDependencies];
  }

  public getConnectedComponents(): DependencyGraph[] {
    const undirectedGraph: Record<string, Set<string>> = {};

    for (const [
      sourceName,
      dependencies,
    ] of this._dependenciesPerFile.entries()) {
      undirectedGraph[sourceName] = undirectedGraph[sourceName] ?? new Set();
      for (const dependency of dependencies) {
        undirectedGraph[dependency.sourceName] =
          undirectedGraph[dependency.sourceName] ?? new Set();
        undirectedGraph[sourceName].add(dependency.sourceName);
        undirectedGraph[dependency.sourceName].add(sourceName);
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
      const stack = [...undirectedGraph[node]];
      while (stack.length > 0) {
        const newNode = stack.pop()!;
        if (visited.has(newNode)) {
          continue;
        }
        visited.add(newNode);
        component.add(newNode);
        [...undirectedGraph[newNode]].forEach((adjacent) => {
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
        const file = this._resolvedFiles.get(sourceName)!;
        const dependencies = this._dependenciesPerFile.get(sourceName)!;

        dependencyGraph._resolvedFiles.set(sourceName, file);
        dependencyGraph._dependenciesPerFile.set(sourceName, dependencies);
      }
      connectedComponents.push(dependencyGraph);
    }

    return connectedComponents;
  }

  private _getTransitiveDependencies(
    file: ResolvedFile,
    visited: Set<ResolvedFile>,
    path: ResolvedFile[]
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
      directDependencies
    );

    for (const { dependency } of transitiveDependencies) {
      this._getTransitiveDependencies(
        dependency,
        visited,
        path.concat(dependency)
      ).forEach((x) => transitiveDependencies.add(x));
    }

    return transitiveDependencies;
  }

  private async _addDependenciesFrom(
    resolver: Resolver,
    file: ResolvedFile
  ): Promise<void> {
    if (this._visitedFiles.has(file.absolutePath)) {
      return;
    }

    this._visitedFiles.add(file.absolutePath);

    const dependencies = new Set<ResolvedFile>();
    this._resolvedFiles.set(file.sourceName, file);
    this._dependenciesPerFile.set(file.sourceName, dependencies);

    await Promise.all(
      file.content.imports.map(async (imp) => {
        const dependency = await resolver.resolveImport(file, imp);
        dependencies.add(dependency);

        await this._addDependenciesFrom(resolver, dependency);
      })
    );
  }
}
