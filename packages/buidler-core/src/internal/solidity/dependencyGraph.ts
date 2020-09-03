import { ResolvedFile, Resolver } from "./resolver";

export class DependencyGraph {
  public static async createFromResolvedFiles(
    resolver: Resolver,
    resolvedFiles: ResolvedFile[]
  ): Promise<DependencyGraph> {
    const graph = new DependencyGraph();

    for (const resolvedFile of resolvedFiles) {
      await graph._addDependenciesFrom(resolver, resolvedFile);
    }

    return graph;
  }

  private _resolvedFiles = new Map<string, ResolvedFile>();
  private _dependenciesPerFile = new Map<string, Set<ResolvedFile>>();

  private readonly _visitedFiles = new Set<string>();

  private constructor() {}

  public getResolvedFiles(): ResolvedFile[] {
    return Array.from(this._resolvedFiles.values());
  }

  public get(file: ResolvedFile) {
    return this._dependenciesPerFile.get(file.globalName);
  }

  public has(file: ResolvedFile): boolean {
    return this._resolvedFiles.has(file.globalName);
  }

  public isEmpty(): boolean {
    return this._resolvedFiles.size === 0;
  }

  public entries(): Array<[ResolvedFile, Set<ResolvedFile>]> {
    return Array.from(
      this._dependenciesPerFile.entries()
    ).map(([key, value]) => [this._resolvedFiles.get(key)!, value]);
  }

  public getDependencies(file: ResolvedFile): ResolvedFile[] {
    const dependencies =
      this._dependenciesPerFile.get(file.globalName) ?? new Set();

    return [...dependencies];
  }

  public getTransitiveDependencies(file: ResolvedFile): ResolvedFile[] {
    const visited = new Set<ResolvedFile>();

    const transitiveDependencies = this._getTransitiveDependencies(
      file,
      visited
    );

    return [...transitiveDependencies];
  }

  public getConnectedComponents(): DependencyGraph[] {
    const undirectedGraph: Record<string, Set<string>> = {};

    for (const [
      globalName,
      dependencies,
    ] of this._dependenciesPerFile.entries()) {
      undirectedGraph[globalName] = undirectedGraph[globalName] ?? new Set();
      for (const dependency of dependencies) {
        undirectedGraph[dependency.globalName] =
          undirectedGraph[dependency.globalName] ?? new Set();
        undirectedGraph[globalName].add(dependency.globalName);
        undirectedGraph[dependency.globalName].add(globalName);
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

      for (const globalName of component) {
        const file = this._resolvedFiles.get(globalName)!;
        const dependencies = this._dependenciesPerFile.get(globalName)!;

        dependencyGraph._resolvedFiles.set(globalName, file);
        dependencyGraph._dependenciesPerFile.set(globalName, dependencies);
      }
      connectedComponents.push(dependencyGraph);
    }

    return connectedComponents;
  }

  private _getTransitiveDependencies(
    file: ResolvedFile,
    visited: Set<ResolvedFile>
  ): Set<ResolvedFile> {
    if (visited.has(file)) {
      return new Set();
    }
    visited.add(file);

    const directDependencies = this.getDependencies(file);
    const transitiveDependencies = new Set<ResolvedFile>(directDependencies);

    for (const transitiveDependency of transitiveDependencies) {
      this._getTransitiveDependencies(
        transitiveDependency,
        visited
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
    this._resolvedFiles.set(file.globalName, file);
    this._dependenciesPerFile.set(file.globalName, dependencies);

    for (const imp of file.content.imports) {
      const dependency = await resolver.resolveImport(file, imp);
      dependencies.add(dependency);

      await this._addDependenciesFrom(resolver, dependency);
    }
  }
}
