import * as fs from "fs";

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

interface FlattenInput {
  files?: string[];
  unifyABIEncoderV2?: boolean;
  removeLicenses?: boolean;
  license?: string;
}

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
  const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+)[\s\S]*?;\s*$/gm;

  return resolvedFile.content.rawContent
    .replace(IMPORT_SOLIDITY_REGEX, "")
    .trim();
}

subtask(
  TASK_FLATTEN_GET_FLATTENED_SOURCE,
  "Returns all contracts and their dependencies flattened"
)
  .addOptionalParam("files", undefined, undefined, types.any)
  .addOptionalParam("unifyABIEncoderV2", undefined, false, types.boolean)
  .addOptionalParam("removeLicenses", undefined, false, types.boolean)
  .addOptionalParam("license", undefined, undefined, types.string)
  .setAction(
    async (
      {
        files,
        unifyABIEncoderV2 = false,
        removeLicenses = false,
        license,
      }: FlattenInput,
      { run }
    ) => {
      const dependencyGraph: DependencyGraph = await run(
        TASK_FLATTEN_GET_DEPENDENCY_GRAPH,
        { files }
      );

      let flattened = "";

      if (dependencyGraph.getResolvedFiles().length === 0) {
        return flattened;
      }

      const packageJson = await getPackageJson();

      const sortedFiles = getSortedFiles(dependencyGraph);

      let isFirst = true;
      for (const file of sortedFiles) {
        if (!isFirst) {
          flattened += "\n";
        }
        flattened += `// File ${file.getVersionedName()}\n`;
        flattened += `\n${getFileWithoutImports(file)}\n`;

        isFirst = false;
      }

      if (removeLicenses || license !== undefined) {
        // Remove every line started with "// SPDX-License-Identifier:"
        flattened = flattened.replace(
          /^\s*\/\/\s*SPDX-License-Identifier:.*\n?/gm,
          ""
        );
      }

      if (license !== undefined) {
        flattened = `// SPDX-License-Identifier: ${license}\n\n${flattened}`;
      }

      if (unifyABIEncoderV2) {
        // Remove every line started with "pragma experimental ABIEncoderV2;" except the first one
        let first = true;
        flattened = flattened.replace(
          /pragma experimental ABIEncoderV2;\n/gm,
          (pragma) => {
            if (first) {
              first = false;
              return pragma;
            }
            return "";
          }
        );
      }

      flattened = `// Sources flattened with hardhat v${packageJson.version} https://hardhat.org\n\n${flattened}`;
      return flattened.trim();
    }
  );

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
  .addFlag(
    "unifyABIEncoderV2",
    "Whether to unify 'pragma experimental ABIEncoderV2' ocurrences"
  )
  .addFlag("removeLicenses", "Whether licenses should be removed or not")
  .addOptionalParam("license", "License for each file", undefined, types.string)
  .setAction(
    async (
      { files, unifyABIEncoderV2, removeLicenses, license }: FlattenInput,
      { run }
    ) => {
      console.log(
        await run(TASK_FLATTEN_GET_FLATTENED_SOURCE, {
          files,
          unifyABIEncoderV2,
          removeLicenses,
          license,
        })
      );
    }
  );
