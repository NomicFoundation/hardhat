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

  public readonly dependenciesPerFile = new Map<
    ResolvedFile,
    Set<ResolvedFile>
  >();

  private readonly _visitedFiles = new Set<string>();

  private constructor() {}

  public getResolvedFiles(): ResolvedFile[] {
    return Array.from(this.dependenciesPerFile.keys());
  }

  public getTransitiveDependencies(file: ResolvedFile): ResolvedFile[] {
    const visited = new Set<ResolvedFile>();

    const transitiveDependencies = this._getTransitiveDependencies(
      file,
      visited
    );

    return [...transitiveDependencies];
  }

  private _getTransitiveDependencies(
    file: ResolvedFile,
    visited: Set<ResolvedFile>
  ): Set<ResolvedFile> {
    if (visited.has(file)) {
      return new Set();
    }
    visited.add(file);

    const transitiveDependencies =
      this.dependenciesPerFile.get(file) ?? new Set();

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
    this.dependenciesPerFile.set(file, dependencies);

    for (const imp of file.content.imports) {
      const dependency = await resolver.resolveImport(file, imp);
      dependencies.add(dependency);

      await this._addDependenciesFrom(resolver, dependency);
    }
  }
}
