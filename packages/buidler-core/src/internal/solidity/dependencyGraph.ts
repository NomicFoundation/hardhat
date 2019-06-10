import { getImports } from "./imports";
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

    const imports = getImports(file.content);

    for (const imp of imports) {
      const dependency = await resolver.resolveImport(file, imp);
      dependencies.add(dependency);

      await this._addDependenciesFrom(resolver, dependency);
    }
  }
}
