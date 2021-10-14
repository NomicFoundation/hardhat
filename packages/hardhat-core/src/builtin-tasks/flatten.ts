import { Exception } from "@sentry/types";
import { resolve } from "dns";
import * as fs from "fs";
import resolve from "resolve";

import { subtask, task, types } from "../internal/core/config/config-env";
import { HardhatError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import { DependencyGraph } from "../internal/solidity/dependencyGraph";
import { ResolvedFile, ResolvedFilesMap } from "../internal/solidity/resolver";
import { getPackageJson } from "../internal/util/packageInfo";

import {
  TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH,
  TASK_COMPILE_SOLIDITY_GET_SOURCE_NAMES,
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
  TASK_FLATTEN,
  TASK_FLATTEN_GET_DEPENDENCY_GRAPH,
  TASK_FLATTEN_GET_FLATTENED_SOURCE,
} from "./task-names";

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
  } catch (error : any) {
    if (error.toString().includes("Error: There is a cycle in the graph.")) {
      throw new HardhatError(ERRORS.BUILTIN_TASKS.FLATTEN_CYCLE, error);
    }

    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw error;
  }
}

function getFileWithoutImports(resolvedFile: ResolvedFile) {
  const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+)[\s\S]*?;\s*$/gm;

  return resolvedFile.content.rawContent
    .replace(IMPORT_SOLIDITY_REGEX, "")
    .trim();
}

function getFileWithoutLicense(resolvedFile : ResolvedFile, license : string) {
  // clone the original
  let newResolvedFile = new ResolvedFile(
    resolvedFile.sourceName,
    resolvedFile.absolutePath,
    resolvedFile.content,
    resolvedFile.contentHash,
    resolvedFile.lastModificationDate
  )
  newResolvedFile.content.rawContent = resolvedFile
                                      .content
                                      .rawContent
                                      .replace(license, "")
                                      .trim();
  return newResolvedFile;
}

function getLicense(resolvedFile: ResolvedFile) {
  const LicenseRegex = /\s*\/\/(\s+)SPDX-License-Identifier:(\s+)(\w+)/gm;
  const match = resolvedFile.content.rawContent.match(LicenseRegex);
  return match != undefined ? match[0] : ""
}

subtask(
  TASK_FLATTEN_GET_FLATTENED_SOURCE,
  "Returns all contracts and their dependencies flattened"
)
  .addOptionalParam("files", undefined, undefined, types.any)
  .setAction(async ({ files }: { files?: string[] }, { run }) => {
    const dependencyGraph: DependencyGraph = await run(
      TASK_FLATTEN_GET_DEPENDENCY_GRAPH,
      { files }
    );

    let flattened = "";

    if (dependencyGraph.getResolvedFiles().length === 0) {
      return flattened;
    }

    const packageJson = await getPackageJson();
    flattened += `// Sources flattened with hardhat v${packageJson.version} https://hardhat.org`;

    const sortedFiles = getSortedFiles(dependencyGraph);
    // let licenses : string[] = []
    let licenseDup = false
    let license = ""

    for (const file of sortedFiles) {
      flattened += `\n\n// File ${file.getVersionedName()}\n`;
      license = getLicense(file);
      if (!licenseDup && license != "") {
        licenseDup = true;
        flattened += `\n${getFileWithoutImports(file)}\n`;
      } else if (licenseDup && license != "") {
        // remove license if duplicate
        flattened += `\n${getFileWithoutImports(getFileWithoutLicense(file, license))}\n`;
      } else {
        flattened += `\n${getFileWithoutImports(file)}\n`;
      }
      // flattened += `\n${getFileWithoutImports(file)}\n`;
      // licenses.push(getLicense(file))
    }

    return flattened.trim();
  });

subtask(TASK_FLATTEN_GET_DEPENDENCY_GRAPH)
  .addOptionalParam("files", undefined, undefined, types.any)
  .setAction(async ({ files }: { files: string[] | undefined }, { run }) => {
    const sourcePaths: string[] =
      files === undefined
        ? await run(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS)
        : files.map((f) => fs.realpathSync(f));

    const sourceNames: string[] = await run(
      TASK_COMPILE_SOLIDITY_GET_SOURCE_NAMES,
      {
        sourcePaths,
      }
    );

    const dependencyGraph: DependencyGraph = await run(
      TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH,
      { sourceNames }
    );

    return dependencyGraph;
  });

task(TASK_FLATTEN, "Flattens and prints contracts and their dependencies")
  .addOptionalVariadicPositionalParam(
    "files",
    "The files to flatten",
    undefined,
    types.inputFile
  )
  .setAction(async ({ files }: { files: string[] | undefined }, { run }) => {
    console.log(await run(TASK_FLATTEN_GET_FLATTENED_SOURCE, { files }));
  });
