import { getImports } from "./imports";
import { ResolvedFile, Resolver } from "./resolver";

export class DependencyGraph {
  public static async createFromResolvedFiles(
    resolver: Resolver,
    resolvedFiles: ResolvedFile[]
  ) {
    const graph = new DependencyGraph();

    for (const resolvedFile of resolvedFiles) {
      await graph.addDependenciesFrom(resolver, resolvedFile);
    }

    return graph;
  }

  public readonly dependenciesPerFile = new Map<
    ResolvedFile,
    Set<ResolvedFile>
  >();

  private readonly visitedFiles = new Set<string>();

  private constructor() {}

  public getResolvedFiles(): ResolvedFile[] {
    return Array.from(this.dependenciesPerFile.keys());
  }

  private async addDependenciesFrom(resolver: Resolver, file: ResolvedFile) {
    if (this.visitedFiles.has(file.absolutePath)) {
      return;
    }

    this.visitedFiles.add(file.absolutePath);

    const dependencies = new Set();
    this.dependenciesPerFile.set(file, dependencies);

    const imports = getImports(file.content);

    for (const imp of imports) {
      const dependency = await resolver.resolveImport(file, imp);
      dependencies.add(dependency);

      await this.addDependenciesFrom(resolver, dependency);
    }
  }
}
