import { getImports } from "./imports";
import { ResolvedFile } from "./resolver";

export class DependencyGraph {
  private dependenciesPerFile = new Map<ResolvedFile, Set<ResolvedFile>>();

  static async createFromResolvedFiles(
    resolver,
    resolvedFiles: ResolvedFile[]
  ) {
    const graph = new DependencyGraph();

    for (const resolvedFile of resolvedFiles) {
      if (!graph.dependenciesPerFile.has(resolvedFile)) {
        await graph.addDependenciesFrom(resolver, resolvedFile);
      }
    }

    return graph;
  }

  getResolvedFiles(): ResolvedFile[] {
    return Array.from(this.dependenciesPerFile.keys());
  }

  async addDependenciesFrom(resolver, file) {
    const dependencies = new Set();
    this.dependenciesPerFile.set(file, dependencies);

    const imports = await getImports(file.content);

    for (const imp of imports) {
      const dependency = await resolver.resolveImport(file, imp);
      dependencies.add(dependency);

      if (!this.dependenciesPerFile.has(dependency)) {
        await this.addDependenciesFrom(resolver, dependency);
      }
    }
  }
}
