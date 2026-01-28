import type { HookContext } from "hardhat/types/hooks";
import type { CompilerOutput } from "hardhat/types/solidity";

import fs from "node:fs/promises";
import path from "node:path";

interface SolidityBuildInfoOutput {
  output: CompilerOutput;
}

/**
 * Gets all existing exposed contract files.
 * Used to ensure exposed contracts are included in builds even when source is cached.
 *
 * @param context - The hook context containing config
 * @returns Array of absolute paths to existing exposed contract files
 */
export async function getExistingExposedContracts(
  context: HookContext,
): Promise<string[]> {
  const exposedContractsPath = context.config.paths.exposedContracts;

  try {
    await fs.access(exposedContractsPath);
  } catch {
    // Directory doesn't exist
    return [];
  }

  return getFilesRecursively(exposedContractsPath, ".sol");
}

/**
 * Gets the exposed contract path for a given user source name.
 *
 * @param context - The hook context containing config
 * @param rootFilePath - The absolute path to the root file
 * @returns Absolute path to the exposed contract file
 */
export function getExposedPath(
  context: HookContext,
  rootFilePath: string,
): string {
  return path.join(
    context.config.paths.exposedContracts,
    path.relative(context.config.paths.root, rootFilePath),
  );
}

async function getFilesRecursively(
  dir: string,
  ext: string,
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getFilesRecursively(fullPath, ext)));
    } else if (entry.name.endsWith(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Generates exposed contract wrappers for all roots in the given compilation jobs.
 *
 * This function:
 * 1. Reads build info output from artifacts for each root file to regenerate
 * 2. Filters files that should be exposed (excludes npm and already-exposed files)
 * 3. Generates wrapper contracts that inherit from the original contracts
 *
 * @param context - The hook context containing config and artifacts
 * @param rootFilesToRegenerate - Array of objects of the root files to regenerate and their build ids
 * @returns Array of generated file paths, or empty array if nothing to generate
 */
export async function generateExposedContractsForCompilationJobsRoots(
  context: HookContext,
  rootFilesToRegenerate: Array<{ rootPath: string; buildId: string }>,
): Promise<string[]> {
  const exposedContractsPath = context.config.paths.exposedContracts;
  const generatedFiles: string[] = [];

  // Group the root files by build id
  const rootFilesPathsByBuildId = new Map<string, string[]>();
  for (const { rootPath, buildId } of rootFilesToRegenerate) {
    let rootFiles = rootFilesPathsByBuildId.get(buildId);
    if (rootFiles === undefined) {
      rootFiles = [];
      rootFilesPathsByBuildId.set(buildId, rootFiles);
    }

    rootFiles.push(rootPath);
  }

  for (const [buildId, rootFilePaths] of rootFilesPathsByBuildId) {
    const outputPath = await context.artifacts.getBuildInfoOutputPath(buildId);
    if (outputPath === undefined) {
      continue;
    }

    const outputContent = await fs.readFile(outputPath, "utf-8");
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      -- We don't have an api without casting for this yet */
    const buildInfoOutput = JSON.parse(
      outputContent,
    ) as SolidityBuildInfoOutput;
    if (buildInfoOutput.output === undefined) {
      continue;
    }

    const compilationOutput = buildInfoOutput.output;

    for (const rootFilePath of rootFilePaths) {
      // The given that we are skipping npm files, we know that the users source
      // name is the relative path from the root of the file, and it's input
      // source name is `project/${userSourceName}`.
      const userSourceName = rootFilePath.replace(
        context.config.paths.root.replace(/\\/g, "/") + "/",
        "",
      );
      const inputSourceName = `project/${userSourceName}`;
      const generatedFilePath = path.join(exposedContractsPath, userSourceName);

      const content = generateExposedContractContent(
        rootFilePath,
        generatedFilePath,
        inputSourceName,
        compilationOutput,
      );

      // Only write if there's content (contracts to expose)
      if (content.length > 0) {
        await fs.mkdir(path.dirname(generatedFilePath), { recursive: true });
        await fs.writeFile(generatedFilePath, content);
        generatedFiles.push(generatedFilePath);
      }
    }
  }

  return generatedFiles;
}

/**
 * Generates the content for an exposed contracts file.
 */
function generateExposedContractContent(
  originalFilePath: string,
  generatedFilePath: string,
  inputSourceName: string,
  compilerOutput: CompilerOutput,
): string {
  const sourceOutput = compilerOutput.sources[inputSourceName];
  if (sourceOutput === undefined || sourceOutput.ast === undefined) {
    return "";
  }

  const ast = sourceOutput.ast;

  // Find all contract definitions (skip interfaces and libraries)
  const contracts = ast.nodes.filter(
    (node: any) =>
      node.nodeType === "ContractDefinition" &&
      node.contractKind === "contract",
  );

  if (contracts.length === 0) {
    return "";
  }

  // Calculate relative import path
  const importPath = path.relative(
    path.dirname(generatedFilePath),
    originalFilePath,
  );

  // Generate file content
  const lines: string[] = [];
  lines.push(`// SPDX-License-Identifier: UNLICENSED`);
  lines.push(`pragma solidity ^0.8.0;`);
  lines.push(`import "${importPath}";`);
  lines.push("");

  for (const contract of contracts) {
    lines.push(`contract ${contract.name}Exposed is ${contract.name} {}`);
    lines.push("");
  }

  return lines.join("\n");
}
