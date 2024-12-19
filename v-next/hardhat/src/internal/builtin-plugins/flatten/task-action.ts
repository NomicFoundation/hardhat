import type { DependencyGraph, ResolvedFile } from "../../../types/solidity.js";
import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { resolveFromRoot } from "@ignored/hardhat-vnext-utils/path";
import chalk from "chalk";
import toposort from "toposort";

import { getHardhatVersion } from "../../utils/package.js";
import { buildDependencyGraph } from "../solidity/build-system/dependency-graph-building.js";
import { isNpmRootPath } from "../solidity/build-system/root-paths-utils.js";

// Match every group where a SPDX license is defined. The first captured group is the license.
const SPDX_LICENSES_REGEX =
  /^(?:\/\/|\/\*)\s*SPDX-License-Identifier:\s*([a-zA-Z\d+.-]+).*/gm;
// Match every group where a pragma directive is defined. The first captured group is the pragma directive.
const PRAGMA_DIRECTIVES_REGEX =
  /^(?: |\t)*(pragma\s*abicoder\s*v(1|2)|pragma\s*experimental\s*ABIEncoderV2)\s*;/gim;

export interface FlattenActionArguments {
  files: string[];
}

export interface FlattenActionResult {
  flattened: string;
  metadata: FlattenMetadata | null;
}

export interface FlattenMetadata {
  filesWithoutLicenses: string[];
  pragmaDirective: string;
  filesWithoutPragmaDirectives: string[];
  filesWithDifferentPragmaDirectives: string[];
}

const flattenAction: NewTaskActionFunction<FlattenActionArguments> = async (
  { files },
  { solidity, config },
): Promise<FlattenActionResult> => {
  // Resolve files from arguments or default to all root files
  const rootPaths =
    files.length === 0
      ? await solidity.getRootFilePaths()
      : files.map((file) => {
          if (isNpmRootPath(file)) {
            return file;
          }

          return resolveFromRoot(process.cwd(), file);
        });

  // Build the dependency graph
  const { dependencyGraph } = await buildDependencyGraph(
    rootPaths.toSorted(), // We sort them to have a deterministic order
    config.paths.root,
    config.solidity.remappings,
  );

  let flattened = "";

  // Return empty string when no files are resolved
  if (Array.from(dependencyGraph.getAllFiles()).length === 0) {
    return { flattened, metadata: null };
  }

  // Write a comment with hardhat version used to flatten
  const hardhatVersion = await getHardhatVersion();
  flattened += `// Sources flattened with hardhat v${hardhatVersion} https://hardhat.org`;

  const sortedFiles = getSortedFiles(dependencyGraph);

  const [licenses, filesWithoutLicenses] = getLicensesInfo(sortedFiles);

  const [
    pragmaDirective,
    filesWithoutPragmaDirectives,
    filesWithDifferentPragmaDirectives,
  ] = getPragmaAbicoderDirectiveInfo(sortedFiles);

  // Write the combined license header and pragma abicoder directive with highest importance
  flattened += getLicensesHeader(licenses);
  flattened += getPragmaAbicoderDirectiveHeader(pragmaDirective);

  for (const file of sortedFiles) {
    let normalizedText = getTextWithoutImports(file);
    normalizedText = commentLicenses(normalizedText);
    normalizedText = commentPragmaAbicoderDirectives(normalizedText);

    // Write files without imports, with commented licenses and pragma abicoder directives
    flattened += `\n\n// File ${file.sourceName}\n`;
    flattened += `\n${normalizedText}\n`;
  }

  // Print the flattened file
  console.log(flattened);

  if (filesWithoutLicenses.length > 0) {
    console.warn(
      chalk.yellow(
        `\nThe following file(s) do NOT specify SPDX licenses: ${filesWithoutLicenses.join(
          ", ",
        )}`,
      ),
    );
  }

  if (pragmaDirective !== "" && filesWithoutPragmaDirectives.length > 0) {
    console.warn(
      chalk.yellow(
        `\nPragma abicoder directives are defined in some files, but they are not defined in the following ones: ${filesWithoutPragmaDirectives.join(
          ", ",
        )}`,
      ),
    );
  }

  if (filesWithDifferentPragmaDirectives.length > 0) {
    console.warn(
      chalk.yellow(
        `\nThe flattened file is using the pragma abicoder directive '${pragmaDirective}' but these files have a different pragma abicoder directive: ${filesWithDifferentPragmaDirectives.join(
          ", ",
        )}`,
      ),
    );
  }

  return {
    flattened,
    metadata: {
      filesWithoutLicenses,
      pragmaDirective,
      filesWithoutPragmaDirectives,
      filesWithDifferentPragmaDirectives,
    },
  };
};

function getLicensesInfo(sortedFiles: ResolvedFile[]): [string[], string[]] {
  const licenses: Set<string> = new Set();
  const filesWithoutLicenses: Set<string> = new Set();

  for (const file of sortedFiles) {
    const matches = [...file.content.text.matchAll(SPDX_LICENSES_REGEX)];

    if (matches.length === 0) {
      filesWithoutLicenses.add(file.sourceName);
      continue;
    }

    for (const groups of matches) {
      licenses.add(groups[1]);
    }
  }

  // Sort alphabetically
  return [Array.from(licenses).sort(), Array.from(filesWithoutLicenses).sort()];
}

function getPragmaAbicoderDirectiveInfo(
  sortedFiles: ResolvedFile[],
): [string, string[], string[]] {
  let directive = "";
  const directivesByImportance = [
    "pragma abicoder v1",
    "pragma experimental ABIEncoderV2",
    "pragma abicoder v2",
  ];
  const filesWithoutPragmaDirectives: Set<string> = new Set();
  const filesWithMostImportantDirective: Array<[string, string]> = []; // Every array element has the structure: [ fileName, fileMostImportantDirective ]

  for (const file of sortedFiles) {
    const matches = [...file.content.text.matchAll(PRAGMA_DIRECTIVES_REGEX)];

    if (matches.length === 0) {
      filesWithoutPragmaDirectives.add(file.sourceName);
      continue;
    }

    let fileMostImportantDirective = "";
    for (const groups of matches) {
      const normalizedPragma = removeUnnecessarySpaces(groups[1]);

      // Update the most important pragma directive among all the files
      if (
        directivesByImportance.indexOf(normalizedPragma) >
        directivesByImportance.indexOf(directive)
      ) {
        directive = normalizedPragma;
      }

      // Update the most important pragma directive for the current file
      if (
        directivesByImportance.indexOf(normalizedPragma) >
        directivesByImportance.indexOf(fileMostImportantDirective)
      ) {
        fileMostImportantDirective = normalizedPragma;
      }
    }

    // Add in the array the most important directive for the current file
    filesWithMostImportantDirective.push([
      file.sourceName,
      fileMostImportantDirective,
    ]);
  }

  // Add to the array the files that have a pragma directive which is not the same as the main one that
  // is going to be used in the flatten file
  const filesWithDifferentPragmaDirectives = filesWithMostImportantDirective
    .filter(([, fileDirective]) => fileDirective !== directive)
    .map(([fileName]) => fileName);

  // Sort alphabetically
  return [
    directive,
    Array.from(filesWithoutPragmaDirectives).sort(),
    filesWithDifferentPragmaDirectives.sort(),
  ];
}

function getSortedFiles(dependencyGraph: DependencyGraph): ResolvedFile[] {
  const sortingGraph: Array<[string, string]> = [];
  const visited = new Set<string>();

  const walk = (files: Iterable<ResolvedFile>) => {
    for (const file of files) {
      if (visited.has(file.sourceName)) continue;

      visited.add(file.sourceName);

      // Sort dependencies in alphabetical order for deterministic results
      const dependencies = Array.from(
        dependencyGraph.getDependencies(file),
      ).sort((f1, f2) => f1.sourceName.localeCompare(f2.sourceName));

      for (const dependency of dependencies) {
        sortingGraph.push([dependency.sourceName, file.sourceName]);
      }

      walk(dependencies);
    }
  };

  // Sort roots in alphabetical order for deterministic results
  const roots = Array.from(dependencyGraph.getRoots().values()).sort((f1, f2) =>
    f1.sourceName.localeCompare(f2.sourceName),
  );

  walk(roots);

  // Get all nodes so the graph includes files with no dependencies
  const allSourceNames = Array.from(dependencyGraph.getAllFiles()).map(
    (f) => f.sourceName,
  );

  // Get source names sorted in topological order
  const sortedSourceNames = toposort.array(allSourceNames, sortingGraph);

  const sortedFiles = sortedSourceNames.map((sourceName) =>
    dependencyGraph.getFileBySourceName(sourceName),
  );

  return sortedFiles.filter((f) => f !== undefined);
}

function removeUnnecessarySpaces(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

function getLicensesHeader(licenses: string[]): string {
  return licenses.length <= 0
    ? ""
    : `\n\n// SPDX-License-Identifier: ${licenses.join(" AND ")}`;
}

function getPragmaAbicoderDirectiveHeader(pragmaDirective: string): string {
  return pragmaDirective === "" ? "" : `\n\n${pragmaDirective};`;
}

function getTextWithoutImports(resolvedFile: ResolvedFile) {
  const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+)[\s\S]*?;\s*$/gm;

  return resolvedFile.content.text.replace(IMPORT_SOLIDITY_REGEX, "").trim();
}

function commentLicenses(file: string): string {
  return file.replaceAll(
    SPDX_LICENSES_REGEX,
    (...groups) => `// Original license: SPDX_License_Identifier: ${groups[1]}`,
  );
}

function commentPragmaAbicoderDirectives(file: string): string {
  return file.replaceAll(PRAGMA_DIRECTIVES_REGEX, (...groups) => {
    return `// Original pragma directive: ${removeUnnecessarySpaces(
      groups[1],
    )}`;
  });
}

export default flattenAction;
