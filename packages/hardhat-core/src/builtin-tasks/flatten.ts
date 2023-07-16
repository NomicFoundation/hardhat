import { subtask, task, types } from "../internal/core/config/config-env";
import { HardhatError } from "../internal/core/errors";
import { ERRORS } from "../internal/core/errors-list";
import { DependencyGraph } from "../internal/solidity/dependencyGraph";
import { ResolvedFile, ResolvedFilesMap } from "../internal/solidity/resolver";
import { getPackageJson } from "../internal/util/packageInfo";

import { getRealPathSync } from "../internal/util/fs-utils";
import {
  TASK_COMPILE_SOLIDITY_GET_DEPENDENCY_GRAPH,
  TASK_COMPILE_SOLIDITY_GET_SOURCE_NAMES,
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
  TASK_FLATTEN,
  TASK_FLATTEN_GET_DEPENDENCY_GRAPH,
  TASK_FLATTEN_GET_FLATTENED_SOURCE,
} from "./task-names";

// Match every line where a SPDX license is defined. The first captured group is the license.
const SPDX_LICENSES_REGEX =
  /^(?:\/\/|\/\*) *SPDX-License-Identifier:\s*([\w\d._-]+) *(\*\/)?(\n|$)/gim;
// Match every line where a pragma directive is defined. The first captured group is the pragma directive.
const PRAGMA_DIRECTIVE_REGEX =
  /^ *(pragma +abicoder +v(1|2)|pragma experimental ABIEncoderV2); *(\n|$)/gim;

function getSortedFiles(dependenciesGraph: DependencyGraph) {
  const tsort = require("tsort");
  const graph = tsort();

  // sort the graph entries to make the results deterministic
  const dependencies = dependenciesGraph
    .entries()
    .sort(([a], [b]) => a.sourceName.localeCompare(b.sourceName));

  const filesMap: ResolvedFilesMap = {};
  const resolvedFiles = dependencies.map(([file, _deps]) => file);

  resolvedFiles.forEach((f) => (filesMap[f.sourceName] = f));

  for (const [from, deps] of dependencies) {
    // sort the dependencies to make the results deterministic
    const sortedDeps = [...deps].sort((a, b) =>
      a.sourceName.localeCompare(b.sourceName)
    );

    for (const to of sortedDeps) {
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
    if (error instanceof Error) {
      if (error.toString().includes("Error: There is a cycle in the graph.")) {
        throw new HardhatError(ERRORS.BUILTIN_TASKS.FLATTEN_CYCLE, {}, error);
      }
    }

    // eslint-disable-next-line @nomicfoundation/hardhat-internal-rules/only-hardhat-error
    throw error;
  }
}

function getFileWithoutImports(resolvedFile: ResolvedFile) {
  const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+)[\s\S]*?;\s*$/gm;

  return resolvedFile.content.rawContent
    .replace(IMPORT_SOLIDITY_REGEX, "")
    .trim();
}

function addLicensesHeader(sortedFiles: ResolvedFile[]): string {
  const licenses: Set<string> = new Set();

  for (const file of sortedFiles) {
    const matches = [...file.content.rawContent.matchAll(SPDX_LICENSES_REGEX)];

    for (const [, license] of matches) {
      licenses.add(license);
    }
  }

  return licenses.size <= 0
    ? ""
    : `\n\n// SPDX-License-Identifier: ${Array.from(licenses)
        .sort() // Sort alphabetically
        .join(" AND ")}`;
}

function addPragmaAbicoderDirectiveHeader(sortedFiles: ResolvedFile[]): string {
  let directive = "";
  const directivesByImportance = [
    "pragma abicoder v1",
    "pragma experimental ABIEncoderV2",
    "pragma abicoder v2",
  ];

  for (const file of sortedFiles) {
    const matches = [
      ...file.content.rawContent.matchAll(PRAGMA_DIRECTIVE_REGEX),
    ];

    for (const [, currV] of matches) {
      if (
        directivesByImportance.indexOf(currV) >
        directivesByImportance.indexOf(directive)
      ) {
        directive = currV;
      }
    }
  }

  return directive === "" ? "" : `\n\n${directive};`;
}

function replaceLicenses(file: string): string {
  const originalLicense = "// Original license: SPDX_License_Identifier:";

  return file.replace(
    SPDX_LICENSES_REGEX,
    (...groups) => `${originalLicense} ${groups[1]}\n`
  );
}

function replacePragmaAbicoderDirectives(file: string): string {
  const originalPragmaDirective = "// Original pragma directive:";

  return file.replace(
    PRAGMA_DIRECTIVE_REGEX,
    (...groups) => `${originalPragmaDirective} ${groups[1]}\n`
  );
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

    flattened += addLicensesHeader(sortedFiles);
    flattened += addPragmaAbicoderDirectiveHeader(sortedFiles);

    for (const file of sortedFiles) {
      flattened += `\n\n// File ${file.getVersionedName()}\n`;

      let tmpFile = getFileWithoutImports(file);
      tmpFile = replaceLicenses(tmpFile);
      tmpFile = replacePragmaAbicoderDirectives(tmpFile);

      flattened += `\n${tmpFile}\n`;
    }

    return flattened.trim();
  });

subtask(TASK_FLATTEN_GET_DEPENDENCY_GRAPH)
  .addOptionalParam("files", undefined, undefined, types.any)
  .setAction(async ({ files }: { files: string[] | undefined }, { run }) => {
    const sourcePaths: string[] =
      files === undefined
        ? await run(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS)
        : files.map((f) => getRealPathSync(f));

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

task(
  TASK_FLATTEN,
  "Flattens and prints contracts and their dependencies. If no file is passed, all the contracts in the project will be flattened."
)
  .addOptionalVariadicPositionalParam(
    "files",
    "The files to flatten",
    undefined,
    types.inputFile
  )
  .setAction(async ({ files }: { files: string[] | undefined }, { run }) => {
    console.log(await run(TASK_FLATTEN_GET_FLATTENED_SOURCE, { files }));
  });
