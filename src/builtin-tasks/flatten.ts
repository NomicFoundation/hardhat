import { internalTask, task } from "../internal/core/config/config-env";
import { BuidlerError, ERRORS } from "../internal/core/errors";
import { DependencyGraph } from "../internal/solidity/dependencyGraph";
import { ResolvedFile, ResolvedFilesMap } from "../internal/solidity/resolver";
import { getPackageJson } from "../internal/util/packageInfo";

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

  let topologicalSortedNames;
  try {
    topologicalSortedNames = graph.sort();
  } catch (error) {
    if (error.toString().includes("Error: There is a cycle in the graph.")) {
      throw new BuidlerError(ERRORS.BUILTIN_TASKS.FLATTEN_CYCLE, error);
    }
  }

  // If an entry has no dependency it won't be included in the graph, so we
  // add them and then dedup the array
  const withEntries = topologicalSortedNames.concat(
    resolvedFiles.map(f => f.globalName)
  );

  const sortedNames = [...new Set(withEntries)] as string[];
  return sortedNames.map(n => filesMap[n]);
}

function getFileWithoutImports(resolvedFile: ResolvedFile) {
  const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+).*$/gm;

  return resolvedFile.content.replace(IMPORT_SOLIDITY_REGEX, "").trim();
}

internalTask("flatten:flatten", async (_, { run }) => {
  const packageJson = await getPackageJson();
  let flattened = "";
  flattened += `// Sources flattened with buidler v${
    packageJson.version
  } https://getbuidler.com\n`;

  flattened += await run("flatten:get-flattened-sources");
  return flattened;
});


internalTask(
  "flatten:get-flattened-sources",
  "Returns all contracts and their dependencies flattened",
  async (_, { config, run }) => {
    const graph = await run("builtin:get-dependency-graph");
    const sortedFiles = getSortedFiles(graph);

    let flattened = "";

    for (const file of sortedFiles) {
      flattened += `\n\n// File ${file.getVersionedName()}\n`;
      flattened += `\n${getFileWithoutImports(file)}\n`;
    }

    return flattened.trim();
  }
);

task(
  "flatten",
  "Flattens and prints all contracts and their dependencies",
  async (_, { config, run }) => {
    console.log(await run("flatten:flatten"));
  }
);
