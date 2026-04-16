import type {
  BuildScope,
  SolidityBuildSystem,
} from "../../../../types/solidity.js";
import type { NewTaskActionFunction } from "../../../../types/tasks.js";

import {
  assertHardhatInvariant,
  HardhatError,
} from "@nomicfoundation/hardhat-errors";
import { resolveFromRoot } from "@nomicfoundation/hardhat-utils/path";

import { throwIfSolidityBuildFailed } from "../build-results.js";
import { isNpmRootPath } from "../build-system/root-paths-utils.js";

interface BuildActionArguments {
  force: boolean;
  files: string[];
  quiet: boolean;
  defaultBuildProfile: string;
  noTests: boolean;
  noContracts: boolean;
}

interface BuildActionResult {
  contractRootPaths: string[];
  testRootPaths: string[];
}

const buildAction: NewTaskActionFunction<BuildActionArguments> = async (
  args: BuildActionArguments,
  hre,
): Promise<BuildActionResult> => {
  const buildProfile =
    hre.globalOptions.buildProfile ?? args.defaultBuildProfile;

  const files = normalizeRootPaths(args.files);

  const partitionedFiles = await partitionRootPathsByScope(hre.solidity, files);

  if (args.noContracts && partitionedFiles.contractRootPaths.length > 0) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY.INCOMPATIBLE_FILES_WITH_BUILD_FLAGS,
      {
        files: partitionedFiles.contractRootPaths
          .sort()
          .map((f) => `- ${f}`)
          .join("\n"),
      },
    );
  }

  if (args.noTests && partitionedFiles.testRootPaths.length > 0) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.SOLIDITY.INCOMPATIBLE_FILES_WITH_BUILD_FLAGS,
      {
        files: partitionedFiles.testRootPaths
          .sort()
          .map((f) => `- ${f}`)
          .join("\n"),
      },
    );
  }

  if (hre.config.solidity.splitTestsCompilation) {
    const contractRootPaths: string[] = [];
    const testRootPaths: string[] = [];

    const shouldBuildContracts =
      !args.noContracts &&
      (files.length === 0 || partitionedFiles.contractRootPaths.length > 0);

    if (shouldBuildContracts) {
      const contractBuildResults = await runSolidityBuild({
        buildProfile,
        files: partitionedFiles.contractRootPaths,
        force: args.force,
        isUnifiedModeOrScope: "contracts",
        noContracts: args.noContracts,
        noTests: args.noTests,
        quiet: args.quiet,
        solidity: hre.solidity,
      });

      assertHardhatInvariant(
        contractBuildResults.testRootPaths.length === 0,
        "The contracts scope should build no test in split test compilation mode",
      );

      contractRootPaths.push(...contractBuildResults.contractRootPaths);
      testRootPaths.push(...contractBuildResults.testRootPaths);
    }

    const shouldBuildTests =
      !args.noTests &&
      (files.length === 0 || partitionedFiles.testRootPaths.length > 0);

    if (shouldBuildTests) {
      const testBuildResults = await runSolidityBuild({
        buildProfile,
        files: partitionedFiles.testRootPaths,
        force: args.force,
        isUnifiedModeOrScope: "tests",
        noContracts: args.noContracts,
        noTests: args.noTests,
        quiet: args.quiet,
        solidity: hre.solidity,
      });

      assertHardhatInvariant(
        testBuildResults.contractRootPaths.length === 0,
        "The tests scope should build no contract in split test compilation mode",
      );

      contractRootPaths.push(...testBuildResults.contractRootPaths);
      testRootPaths.push(...testBuildResults.testRootPaths);
    }

    return { contractRootPaths, testRootPaths };
  }

  return runSolidityBuild({
    buildProfile,
    files,
    force: args.force,
    isUnifiedModeOrScope: true,
    noContracts: args.noContracts,
    noTests: args.noTests,
    quiet: args.quiet,
    solidity: hre.solidity,
  });
};

/**
 * Runs a solidity build for a scope/unified mode.
 *
 * Note: The files array should be pre-classified by scope if using split
 * compilation. i.e. it should only include files of the scope being used.
 */
async function runSolidityBuild({
  buildProfile,
  files,
  force,
  isUnifiedModeOrScope,
  noContracts,
  noTests,
  quiet,
  solidity,
}: {
  buildProfile: string;
  files: string[];
  force: boolean;
  isUnifiedModeOrScope: true | BuildScope;
  noContracts: boolean;
  noTests: boolean;
  quiet: boolean;
  solidity: SolidityBuildSystem;
}): Promise<{ contractRootPaths: string[]; testRootPaths: string[] }> {
  const scope =
    isUnifiedModeOrScope === true ? "contracts" : isUnifiedModeOrScope;

  const { isFullBuild, contractRootPaths, testRootPaths } =
    await getRootsToBuild({
      solidity,
      isUnifiedModeOrScope,
      files,
      noTests,
      noContracts,
    });

  // If there's nothing to build and this isn't a full build, we exit early.
  // Full builds with no roots still need to run cleanup to remove stale
  // artifacts.
  if (
    !isFullBuild &&
    contractRootPaths.length === 0 &&
    testRootPaths.length === 0
  ) {
    return { contractRootPaths, testRootPaths };
  }

  const results = await solidity.build(
    [...contractRootPaths, ...testRootPaths],
    {
      force,
      buildProfile,
      quiet,
      scope,
    },
  );

  throwIfSolidityBuildFailed(solidity, results);

  // We use the result keys in case a hook added or removed root files
  const builtRootPaths = [...results.keys()];

  if (isFullBuild) {
    await solidity.cleanupArtifacts(builtRootPaths, {
      scope,
    });
  }

  const preBuildRoots = new Set([...contractRootPaths, ...testRootPaths]);
  if (
    builtRootPaths.length === preBuildRoots.size &&
    builtRootPaths.every((p) => preBuildRoots.has(p))
  ) {
    return { contractRootPaths, testRootPaths };
  }

  return partitionRootPathsByScope(solidity, builtRootPaths);
}

/**
 * Returns the files to build, classified by testRootPaths and
 * contractRootPaths, and a boolean indicating if this represents a full build
 * for the scope/unified build.
 *
 * Note: The files array should be pre-classified by scope if using split
 * compilation. i.e. it should only include files of the scope being used.
 */
async function getRootsToBuild({
  solidity,
  isUnifiedModeOrScope,
  files,
  noTests,
  noContracts,
}: {
  solidity: SolidityBuildSystem;
  isUnifiedModeOrScope: true | BuildScope;
  files: string[];
  noTests: boolean;
  noContracts: boolean;
}): Promise<{
  testRootPaths: string[];
  contractRootPaths: string[];
  isFullBuild: boolean;
}> {
  if (isUnifiedModeOrScope === true) {
    return getRootsToBuildInUnifiedMode({
      files,
      noContracts,
      noTests,
      solidity,
    });
  }

  return getRootsToBuildForScope({
    files,
    scope: isUnifiedModeOrScope,
    solidity,
  });
}

/**
 * Returns the root files to build in unified mode. While they are returned
 * classified as contractRootPaths and testRootPaths, they are expected to be
 * build together. It also returns a boolean indicating if this represents a
 * full unified build.
 *
 * Note: The files array should be normalized already.
 */
async function getRootsToBuildInUnifiedMode({
  files,
  noContracts,
  noTests,
  solidity,
}: {
  files: string[];
  noContracts: boolean;
  noTests: boolean;
  solidity: SolidityBuildSystem;
}): Promise<{
  testRootPaths: string[];
  contractRootPaths: string[];
  isFullBuild: boolean;
}> {
  const isFullBuild = files.length === 0 && !noTests && !noContracts;

  let rootFilePaths: string[];

  if (isFullBuild) {
    // In this mode, "contracts" also returns the tests
    rootFilePaths = await solidity.getRootFilePaths({
      scope: "contracts",
    });
  } else {
    const allRoots =
      files.length > 0
        ? files
        : await solidity.getRootFilePaths({
            scope: "contracts",
          });

    rootFilePaths = [];
    for (const root of allRoots) {
      if (isNpmRootPath(root)) {
        // npm files are considered contract files, so we skip them if
        // --no-contracts
        if (!noContracts) {
          rootFilePaths.push(root);
        }

        continue;
      }

      const scope = await solidity.getScope(root);

      if (noTests && scope === "tests") {
        continue;
      }

      if (noContracts && scope === "contracts") {
        continue;
      }

      rootFilePaths.push(root);
    }
  }

  const partitionedRootPaths = await partitionRootPathsByScope(
    solidity,
    rootFilePaths,
  );

  return {
    isFullBuild,
    ...partitionedRootPaths,
  };
}

/**
 * Returns the root files to build for a certain scope, and a boolean indicating
 * if it's a full build for that scope.
 *
 * Note: The files array should be pre-classified by scope if using split
 * compilation. i.e. it should only include files of the scope being used.
 *
 * Note: One of the returned arrays is always empty, depending on the scope
 * being used.
 */
async function getRootsToBuildForScope({
  files,
  scope,
  solidity,
}: {
  files: string[];
  scope: BuildScope;
  solidity: SolidityBuildSystem;
}): Promise<{
  isFullBuild: boolean;
  contractRootPaths: string[];
  testRootPaths: string[];
}> {
  const isFullBuild = files.length === 0;

  const rootPaths = isFullBuild
    ? await solidity.getRootFilePaths({ scope })
    : files; // This is safe because the files have already been partitioned by scope

  if (scope === "contracts") {
    return { isFullBuild, contractRootPaths: rootPaths, testRootPaths: [] };
  }

  return { isFullBuild, contractRootPaths: [], testRootPaths: rootPaths };
}

/**
 * Partitions root paths by scope, as returned by `solidity.getScope(rootPath)`.
 */
async function partitionRootPathsByScope(
  solidity: SolidityBuildSystem,
  rootPaths: string[],
): Promise<{ contractRootPaths: string[]; testRootPaths: string[] }> {
  const contractRootPaths: string[] = [];
  const testRootPaths: string[] = [];

  for (const rootPath of rootPaths) {
    if (isNpmRootPath(rootPath)) {
      contractRootPaths.push(rootPath);
      continue;
    }

    const scope = await solidity.getScope(rootPath);
    if (scope === "tests") {
      testRootPaths.push(rootPath);
    } else {
      contractRootPaths.push(rootPath);
    }
  }

  return { contractRootPaths, testRootPaths };
}

/**
 * Normalizes the received root paths.
 *
 * If a file is an npm root path or absolute file path, it's returned as is.
 * If it's a relative path it's resolved from the CWD.
 */
function normalizeRootPaths(files: string[]): string[] {
  return files.map((f) => {
    if (isNpmRootPath(f)) {
      return f;
    }

    return resolveFromRoot(process.cwd(), f);
  });
}

export default buildAction;
