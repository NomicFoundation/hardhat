import { internalTask, task } from "../internal/core/config/config-env";
import { HardhatError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import { DependencyGraph } from "../internal/solidity/dependencyGraph";
import { ResolvedFile, ResolvedFilesMap } from "../internal/solidity/resolver";
import { getPackageJson } from "../internal/util/packageInfo";

import { TASKS } from "./task-names";

function getSortedFiles(dependenciesGraph: DependencyGraph) {
  const tsort = require("tsort");
  const graph = tsort();

  const filesMap: ResolvedFilesMap = {};
  const resolvedFiles = dependenciesGraph.getResolvedFiles();
  resolvedFiles.forEach((f) => (filesMap[f.sourceName] = f));

  for (const [from, deps] of dependenciesGraph.entries()) {
    for (const to of deps) {
      graph.add(to.sourceName, from.sourceName);
    }
  }

  try {
    const topologicalSortedNames: string[] = graph.sort();

    // If an entry has no dependency it won't be included in the graph, so we
    // add them and then dedup the array
    const withEntries = topologicalSortedNames.concat(
      resolvedFiles.map((f) => f.sourceName)
    );

    const sortedNames = [...new Set(withEntries)];
    return sortedNames.map((n) => filesMap[n]);
  } catch (error) {
    if (error.toString().includes("Error: There is a cycle in the graph.")) {
      throw new HardhatError(ERRORS.BUILTIN_TASKS.FLATTEN_CYCLE, error);
    }

    // tslint:disable-next-line only-hardhat-error
    throw error;
  }
}

function getFileWithoutImports(resolvedFile: ResolvedFile) {
  const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+).*$/gm;

  return resolvedFile.content.rawContent
    .replace(IMPORT_SOLIDITY_REGEX, "")
    .trim();
}

export default function () {
  internalTask(
    TASKS.FLATTEN.GET_FLATTENED_SOURCES,
    "Returns all contracts and their dependencies flattened",
    async (_, { run }) => {
      let flattened = "";

      const graph: DependencyGraph = await run(
        TASKS.COMPILE.SOLIDITY.GET_DEPENDENCY_GRAPH
      );
      if (graph.getResolvedFiles().length === 0) {
        return flattened;
      }

      const packageJson = await getPackageJson();
      flattened += `// Sources flattened with hardhat v${packageJson.version} https://usehardhat.com`;

      const sortedFiles = getSortedFiles(graph);

      for (const file of sortedFiles) {
        flattened += `\n\n// File ${file.getVersionedName()}\n`;
        flattened += `\n${getFileWithoutImports(file)}\n`;
      }

      return flattened.trim();
    }
  );

  task(
    TASKS.FLATTEN.MAIN,
    "Flattens and prints all contracts and their dependencies",
    async (_, { run }) => {
      console.log(await run(TASKS.FLATTEN.GET_FLATTENED_SOURCES));
    }
  );
}
