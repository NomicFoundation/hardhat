import type { NewTaskActionFunction } from "../../../types/tasks.js";

import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";
import chalk from "chalk";

import {
  ResolvedFileType,
  type DependencyGraph,
  type ResolvedFile,
} from "../../../types/solidity.js";
import { getHardhatVersion } from "../../utils/package.js";
import { buildDependencyGraph } from "../solidity/build-system/dependency-graph-building.js";
import { readSourceFileFactory } from "../solidity/build-system/read-source-file.js";
import { isNpmRootPath } from "../solidity/build-system/root-paths-utils.js";

// Match every group where a SPDX license is defined. The first captured group is the license.
const SPDX_LICENSES_REGEX =
  /^(?:\/\/|\/\*)\s*SPDX-License-Identifier:\s*([a-zA-Z\d+.-]+).*/gm;
// Match every group where a pragma directive is defined. The first captured group is the pragma directive.
const PRAGMA_DIRECTIVES_REGEX =
  /^(?: |\t)*(pragma\s*abicoder\s*v(1|2)|pragma\s*experimental\s*ABIEncoderV2)\s*;/gim;
// Match import statements
const IMPORT_SOLIDITY_REGEX = /^\s*import(\s+)[\s\S]*?;\s*$/gm;

export interface FlattenActionArguments {
  files: string[];
  logFunction?: typeof console.log;
  warnFunction?: typeof console.warn;
}

export interface FlattenActionResult {
  flattened: string;
  metadata?: FlattenMetadata;
}

export interface FlattenMetadata {
  filesWithoutLicenses: string[];
  pragmaDirective: string;
  filesWithoutPragmaDirectives: string[];
  filesWithDifferentPragmaDirectives: string[];
}

const flattenAction: NewTaskActionFunction<FlattenActionArguments> = async (
  { files, logFunction, warnFunction },
  { solidity, config, hooks },
): Promise<FlattenActionResult> => {
  const log = logFunction ?? console.log;
  const warn = warnFunction ?? console.warn;

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
  const dependencyGraph = await buildDependencyGraph(
    rootPaths.toSorted(), // We sort them to have a deterministic order
    config.paths.root,
    readSourceFileFactory(hooks),
  );

  let flattened = "";

  // Return empty string when no files are resolved
  if (Array.from(dependencyGraph.getAllFiles()).length === 0) {
    return { flattened, metadata: undefined };
  }

  // Write a comment with hardhat version used to flatten
  const hardhatVersion = await getHardhatVersion();
  flattened += `// Sources flattened with hardhat v${hardhatVersion} https://hardhat.org`;

  const sortedFiles = getSortedFiles(dependencyGraph);

  const { licenses, filesWithoutLicenses } = getLicensesInfo(sortedFiles);

  const {
    pragmaDirective,
    filesWithoutPragmaDirectives,
    filesWithDifferentPragmaDirectives,
  } = getPragmaAbicoderDirectiveInfo(sortedFiles);

  // Write the combined license header and pragma abicoder directive with highest importance
  flattened += getLicensesHeader(licenses);
  flattened += getPragmaAbicoderDirectiveHeader(pragmaDirective);

  for (const file of sortedFiles) {
    let normalizedText = getTextWithoutImports(file);
    normalizedText = commentOutLicenses(normalizedText);
    normalizedText = commentOutPragmaAbicoderDirectives(normalizedText);

    // Write files without imports, with commented licenses and pragma abicoder directives

    flattened += `\n\n// File ${formatSourceName(file)}\n`;
    flattened += `\n${normalizedText}\n`;
  }

  // Print the flattened file
  log(flattened);

  if (filesWithoutLicenses.length > 0) {
    warn(
      chalk.yellow(
        `\nThe following file(s) do NOT specify SPDX licenses: ${filesWithoutLicenses.join(
          ", ",
        )}`,
      ),
    );
  }

  if (pragmaDirective !== "" && filesWithoutPragmaDirectives.length > 0) {
    warn(
      chalk.yellow(
        `\nPragma abicoder directives are defined in some files, but they are not defined in the following ones: ${filesWithoutPragmaDirectives.join(
          ", ",
        )}`,
      ),
    );
  }

  if (filesWithDifferentPragmaDirectives.length > 0) {
    warn(
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

// We don't display the project's root source name in the flattened file
function formatSourceName(file: ResolvedFile): string {
  return file.type === ResolvedFileType.NPM_PACKAGE_FILE
    ? file.inputSourceName
    : file.inputSourceName.substring(file.package.rootSourceName.length + 1);
}

interface LicensesInfo {
  licenses: string[];
  filesWithoutLicenses: string[];
}

function getLicensesInfo(files: ResolvedFile[]): LicensesInfo {
  const licenses: Set<string> = new Set();
  const filesWithoutLicenses: Set<string> = new Set();

  for (const file of files) {
    const matches = [...file.content.text.matchAll(SPDX_LICENSES_REGEX)];

    if (matches.length === 0) {
      filesWithoutLicenses.add(formatSourceName(file));
      continue;
    }

    for (const groups of matches) {
      licenses.add(groups[1]);
    }
  }

  // Sort alphabetically
  return {
    licenses: Array.from(licenses).sort(),
    filesWithoutLicenses: Array.from(filesWithoutLicenses).sort(),
  };
}

interface PragmaDirectivesInfo {
  pragmaDirective: string;
  filesWithoutPragmaDirectives: string[];
  filesWithDifferentPragmaDirectives: string[];
}

function getPragmaAbicoderDirectiveInfo(
  files: ResolvedFile[],
): PragmaDirectivesInfo {
  let directive = "";
  const directivesByImportance = [
    "pragma abicoder v1",
    "pragma experimental ABIEncoderV2",
    "pragma abicoder v2",
  ];
  const filesWithoutPragmaDirectives: Set<string> = new Set();
  const filesWithMostImportantDirective: Record<string, string> = {};

  for (const file of files) {
    const matches = [...file.content.text.matchAll(PRAGMA_DIRECTIVES_REGEX)];

    if (matches.length === 0) {
      filesWithoutPragmaDirectives.add(formatSourceName(file));
      continue;
    }

    let fileMostImportantDirective = "";
    for (const groups of matches) {
      const normalizedPragma = removeDuplicateAndSurroundingWhitespaces(
        groups[1],
      );

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

    filesWithMostImportantDirective[formatSourceName(file)] =
      fileMostImportantDirective;
  }

  // Add to the array the files that have a pragma directive which is not the same as the main one that
  // is going to be used in the flatten file
  const filesWithDifferentPragmaDirectives = Object.entries(
    filesWithMostImportantDirective,
  )
    .filter(([, fileDirective]) => fileDirective !== directive)
    .map(([fileName]) => fileName)
    .sort();

  // Sort alphabetically
  return {
    pragmaDirective: directive,
    filesWithoutPragmaDirectives: Array.from(
      filesWithoutPragmaDirectives,
    ).sort(),
    filesWithDifferentPragmaDirectives,
  };
}

// Returns files sorted in topological order
function getSortedFiles(dependencyGraph: DependencyGraph): ResolvedFile[] {
  const sortedFiles: ResolvedFile[] = [];

  // Helper function for sorting files by sourceName, for deterministic results
  const sortBySourceName = (files: Iterable<ResolvedFile>) => {
    return Array.from(files).sort((f1, f2) =>
      f1.inputSourceName.localeCompare(f2.inputSourceName),
    );
  };

  // Depth-first walking
  const walk = (files: ResolvedFile[]) => {
    for (const file of files) {
      if (sortedFiles.includes(file)) continue;

      sortedFiles.push(file);

      const dependencies = sortBySourceName(
        Array.from(dependencyGraph.getDependencies(file)).map((d) => d.file),
      );

      walk(dependencies);
    }
  };

  const roots = sortBySourceName(dependencyGraph.getRoots().values());

  walk(roots);

  return sortedFiles;
}

function removeDuplicateAndSurroundingWhitespaces(str: string): string {
  return str.replace(/\s+/g, " ").trim();
}

function getLicensesHeader(licenses: string[]): string {
  return licenses.length === 0
    ? ""
    : `\n\n// SPDX-License-Identifier: ${licenses.join(" AND ")}`;
}

function getPragmaAbicoderDirectiveHeader(pragmaDirective: string): string {
  return pragmaDirective === "" ? "" : `\n\n${pragmaDirective};`;
}

function getTextWithoutImports(resolvedFile: ResolvedFile) {
  return resolvedFile.content.text.replace(IMPORT_SOLIDITY_REGEX, "").trim();
}

function commentOutLicenses(file: string): string {
  return file.replaceAll(
    SPDX_LICENSES_REGEX,
    (...groups) => `// Original license: SPDX_License_Identifier: ${groups[1]}`,
  );
}

function commentOutPragmaAbicoderDirectives(file: string): string {
  return file.replaceAll(PRAGMA_DIRECTIVES_REGEX, (...groups) => {
    return `// Original pragma directive: ${removeDuplicateAndSurroundingWhitespaces(
      groups[1],
    )}`;
  });
}

export default flattenAction;
