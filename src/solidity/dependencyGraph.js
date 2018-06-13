"use strict";
const { getImports } = require("./imports");

class DependencyGraph {
  constructor() {
    this.dependenciesPerFile = new Map();
  }

  static async createFromResolvedFiles(resolver, resolvedFiles) {
    const graph = new DependencyGraph(resolvedFiles);

    for (const resolvedFile of resolvedFiles) {
      if (!graph.dependenciesPerFile.has(resolvedFile)) {
        await graph.addDependenciesFrom(resolver, resolvedFile);
      }
    }

    return graph;
  }

  getResolvedFiles() {
    return this.dependenciesPerFile.keys();
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

module.exports = DependencyGraph;
