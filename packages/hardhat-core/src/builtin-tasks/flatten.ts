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
  TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA,
} from "./task-names";

// Match every group where a SPDX license is defined. The fourth captured group is the license.
const SPDX_LICENSES_REGEX =
  /^(\/\/|\/\*)(\s|\t)*SPDX-License-Identifier:(\s|\t)*([\w\d._-]+).*/gm;
// Match every group where a pragma directive is defined. The second captured group is the pragma directive.
const PRAGMA_DIRECTIVES_REGEX =
  /^( |\t)*(pragma(\s|\t)*abicoder(\s|\t)*v(1|2)|pragma(\s|\t)*experimental(\s|\t)*ABIEncoderV2)(\s|\t)*;/gim;

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

function getLicensesInfo(sortedFiles: ResolvedFile[]): [string[], string[]] {
  const licenses: Set<string> = new Set();
  const filesWithoutLicenses: Set<string> = new Set();

  for (const file of sortedFiles) {
    const matches = [...file.content.rawContent.matchAll(SPDX_LICENSES_REGEX)];

    if (matches.length === 0) {
      filesWithoutLicenses.add(file.sourceName);
      continue;
    }

    for (const groups of matches) {
      licenses.add(groups[4]);
    }
  }

  // Sort alphabetically
  return [Array.from(licenses).sort(), Array.from(filesWithoutLicenses).sort()];
}

function getLicensesHeader(licenses: string[]): string {
  return licenses.length <= 0
    ? ""
    : `\n\n// SPDX-License-Identifier: ${licenses.join(" AND ")}`;
}

function removeUnnecessarySpaces(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

function getPragmaAbicoderDirectiveInfo(
  sortedFiles: ResolvedFile[]
): [string, string[]] {
  let directive = "";
  const directivesByImportance = [
    "pragma abicoder v1",
    "pragma experimental ABIEncoderV2",
    "pragma abicoder v2",
  ];
  const filesWithoutPragmas: Set<string> = new Set();

  for (const file of sortedFiles) {
    const matches = [
      ...file.content.rawContent.matchAll(PRAGMA_DIRECTIVES_REGEX),
    ];

    if (matches.length === 0) {
      filesWithoutPragmas.add(file.sourceName);
      continue;
    }

    for (const groups of matches) {
      const normalizedPragma = removeUnnecessarySpaces(groups[2]);

      if (
        directivesByImportance.indexOf(normalizedPragma) >
        directivesByImportance.indexOf(directive)
      ) {
        directive = normalizedPragma;
      }
    }
  }

  // Sort alphabetically
  return [directive, Array.from(filesWithoutPragmas).sort()];
}

function getPragmaAbicoderDirectiveHeader(pragmaDirective: string): string {
  return pragmaDirective === "" ? "" : `\n\n${pragmaDirective};`;
}

function replaceLicenses(file: string): string {
  return file.replaceAll(
    SPDX_LICENSES_REGEX,
    (...groups) => `// Original license: SPDX_License_Identifier: ${groups[4]}`
  );
}

function replacePragmaAbicoderDirectives(file: string): string {
  return file.replaceAll(PRAGMA_DIRECTIVES_REGEX, (...groups) => {
    return `// Original pragma directive: ${removeUnnecessarySpaces(
      groups[2]
    )}`;
  });
}

subtask(
  TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA,
  "Returns all contracts and their dependencies flattened. Also return metadata about pragma directives and SPDX licenses"
)
  .addOptionalParam("files", undefined, undefined, types.any)
  .setAction(async ({ files }: { files?: string[] }, { run }) => {
    const dependencyGraph: DependencyGraph = await run(
      TASK_FLATTEN_GET_DEPENDENCY_GRAPH,
      { files }
    );

    let flattened = "";

    if (dependencyGraph.getResolvedFiles().length === 0) {
      return [flattened, null];
    }

    const packageJson = await getPackageJson();
    flattened += `// Sources flattened with hardhat v${packageJson.version} https://hardhat.org`;

    const sortedFiles = getSortedFiles(dependencyGraph);

    const [licenses, filesWithoutLicenses] = getLicensesInfo(sortedFiles);
    const [pragmaDirective, filesWithoutPragmas] =
      getPragmaAbicoderDirectiveInfo(sortedFiles);

    flattened += getLicensesHeader(licenses);
    flattened += getPragmaAbicoderDirectiveHeader(pragmaDirective);

    for (const file of sortedFiles) {
      let tmpFile = getFileWithoutImports(file);
      tmpFile = replaceLicenses(tmpFile);
      tmpFile = replacePragmaAbicoderDirectives(tmpFile);

      flattened += `\n\n// File ${file.getVersionedName()}\n`;
      flattened += `\n${tmpFile}\n`;
    }

    return [
      flattened.trim(),
      {
        filesWithoutLicenses,
        filesWithoutPragmas,
      },
    ];
  });

subtask(
  TASK_FLATTEN_GET_FLATTENED_SOURCE,
  "Returns all contracts and their dependencies flattened"
)
  .addOptionalParam("files", undefined, undefined, types.any)
  .setAction(async ({ files }: { files?: string[] }, { run }) => {
    return (
      await run(TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA, { files })
    )[0];
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
    const [flattenedFile, metadata] = await run(
      TASK_FLATTEN_GET_FLATTENED_SOURCE_AND_METADATA,
      { files }
    );

    console.log(flattenedFile);

    // Warn the user when SPDX licenses or pragma abicoder directives are not specified
    if (metadata?.filesWithoutLicenses.length > 0) {
      console.warn(
        `The following file(s) do NOT specify SPDX licenses: ${metadata.filesWithoutLicenses.join(
          ", "
        )}`
      );
    }

    if (metadata?.filesWithoutPragmas.length > 0) {
      console.warn(
        `The following file(s) do NOT specify pragma abicoder directives: ${metadata.filesWithoutPragmas.join(
          ", "
        )}`
      );
    }
  });
