import * as fs from "fs";
import chalk from "chalk";

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
  } catch (error: any) {
    if (error.toString().includes("Error: There is a cycle in the graph.")) {
      throw new HardhatError(ERRORS.BUILTIN_TASKS.FLATTEN_CYCLE, error);
    }

    // eslint-disable-next-line @nomiclabs/hardhat-internal-rules/only-hardhat-error
    throw error;
  }
}

function getFileWithoutImports(fileContent: string) {
  const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+)[\s\S]*?;\s*$/gm;

  return fileContent.replace(IMPORT_SOLIDITY_REGEX, "").trim();
}

function getLicense(resolvedFile: ResolvedFile) {
  const LicenseRegex =
    /\s*\/\/(\s+)SPDX-License-Identifier:(\s+)([a-zA-Z0-9._-]+)/gm;
  const match = resolvedFile.content.rawContent.match(LicenseRegex);
  return match ? match[0] : "";
}

function combineLicenses(licenses: Map<string, string>) {
  const licenseNames: string[] = [];
  for (const value of licenses.values()) {
    licenseNames.push(value.split(":")[1].trim());
  }
  const uniqueLicenseNames = [...new Set(licenseNames)];
  if (uniqueLicenseNames.length === 1) {
    return `// SPDX-License-Identifier: ${uniqueLicenseNames[0]}`;
  } else {
    return `// SPDX-License-Identifier: ${uniqueLicenseNames.join(" AND ")}`;
  }
}

function combinePragmas(pragmas: Map<string, string>) {
  const uniquePragmas = [...new Set(Array.from(pragmas.values()))];

  for (const value of pragmas.values()) {
    const name = value.split(" ")[1];
    const version = value.split(" ")[2];
    if (
      ["abicoder", "experimental"].includes(name) &&
      version.toLowerCase().includes("v2")
    ) {
      if (uniquePragmas.length > 1) {
        console.warn(
          chalk.yellow(`INCOMPATIBLE PRAGMA DIRECTIVES: ${value} was used`)
        );
      }
      return value;
    }
  }

  // just return a pragma if no abiencoder was found
  const out = Array.from(pragmas.values())[0];
  if (uniquePragmas.length > 1) {
    console.warn(
      chalk.yellow(`INCOMPATIBLE PRAGMA DIRECTIVES: ${out} was used`)
    );
  }
  return out;
}

function getPragma(resolvedFile: ResolvedFile) {
  const PragmaRegex = /pragma(\s)([a-zA-Z]+)(\s)([a-zA-Z0-9^.]+);/gm;
  const match = resolvedFile.content.rawContent.match(PragmaRegex);
  return match ? match[0] : "";
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
    const licenses = new Map();
    const pragmas = new Map();

    for (const file of sortedFiles) {
      const pragma = getPragma(file);
      if (pragma !== "") {
        pragmas.set(file.sourceName, pragma);
      }

      const license = getLicense(file);
      if (license !== "") {
        licenses.set(file.sourceName, license);
      }
    }

    for (const file of sortedFiles) {
      flattened += `\n\n// File ${file.getVersionedName()}\n`;

      if (pragmas.size > 0 && !pragmas.has(file.sourceName)) {
        console.warn(
          chalk.yellow(
            `MISSING PRAGMA: File ${file.getVersionedName()} needs a pragma`
          )
        );
      }

      if (licenses.size > 0 && !licenses.has(file.sourceName)) {
        console.warn(
          chalk.yellow(
            `MISSING LICENSE: File ${file.getVersionedName()} needs a license`
          )
        );
      }

      const newFileContent = file.content.rawContent
        .replace(
          licenses.has(file.sourceName) ? licenses.get(file.sourceName) : "",
          ""
        )
        .replace(
          pragmas.has(file.sourceName) ? pragmas.get(file.sourceName) : "",
          ""
        );
      flattened += `\n${getFileWithoutImports(newFileContent)}\n`;
    }

    if (licenses.size > 0) {
      const combined = combineLicenses(licenses);
      flattened = `${combined}\n\n${flattened}`;
    }

    if (pragmas.size > 0) {
      flattened = `${combinePragmas(pragmas)}\n\n${flattened}`;
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
