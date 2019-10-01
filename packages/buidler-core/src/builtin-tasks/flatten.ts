import { internalTask, task } from "../internal/core/config/config-env";
import { BuidlerError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import { DependencyGraph } from "../internal/solidity/dependencyGraph";
import { ResolvedFile, ResolvedFilesMap } from "../internal/solidity/resolver";
import { getPackageJson } from "../internal/util/packageInfo";

import {
  TASK_COMPILE_GET_DEPENDENCY_GRAPH,
  TASK_FLATTEN,
  TASK_FLATTEN_GET_FLATTENED_SOURCE
} from "./task-names";

function getSortedFiles(dependenciesGraph: DependencyGraph) {
  const tsort = require("tsort");
  const graph = tsort();

  const filesMap: ResolvedFilesMap = {};
  const resolvedFiles = dependenciesGraph.getResolvedFiles();
  resolvedFiles.forEach(f => (filesMap[f.globalName] = f));

  for (const [from, deps] of dependenciesGraph.dependenciesPerFile.entries()) {
    for (const to of deps) {
      graph.add(to.globalName, from.globalName);
    }
  }

  try {
    const topologicalSortedNames: string[] = graph.sort();

    // If an entry has no dependency it won't be included in the graph, so we
    // add them and then dedup the array
    const withEntries = topologicalSortedNames.concat(
      resolvedFiles.map(f => f.globalName)
    );

    const sortedNames = [...new Set(withEntries)];
    return sortedNames.map(n => filesMap[n]);
  } catch (error) {
    if (error.toString().includes("Error: There is a cycle in the graph.")) {
      throw new BuidlerError(ERRORS.BUILTIN_TASKS.FLATTEN_CYCLE, error);
    }

    // tslint:disable-next-line only-buidler-error
    throw error;
  }
}

function getFileWithoutImports(resolvedFile: ResolvedFile) {
  const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+).*$/gm;

  return resolvedFile.content.replace(IMPORT_SOLIDITY_REGEX, "").trim();
}

export default function() {
  internalTask(
    TASK_FLATTEN_GET_FLATTENED_SOURCE,
    "Returns all contracts and their dependencies flattened",
    async (_, { run }) => {
      let flattened = "";

      const graph: DependencyGraph = await run(
        TASK_COMPILE_GET_DEPENDENCY_GRAPH
      );
      if (graph.getResolvedFiles().length === 0) {
        return flattened;
      }

      const packageJson = await getPackageJson();
      flattened += `// Sources flattened with buidler v${packageJson.version} https://buidler.dev`;

      const sortedFiles = getSortedFiles(graph);

      for (const file of sortedFiles) {
        flattened += `\n\n// File ${file.getVersionedName()}\n`;
        flattened += `\n${getFileWithoutImports(file)}\n`;
      }

      return flattened.trim();
    }
  );

  task(
    TASK_FLATTEN,
    "Flattens and prints all contracts and their dependencies",
    async (_, { run }) => {
      console.log(await run(TASK_FLATTEN_GET_FLATTENED_SOURCE));
    }
  );
}
