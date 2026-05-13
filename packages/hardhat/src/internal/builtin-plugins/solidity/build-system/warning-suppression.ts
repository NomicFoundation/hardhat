import path from "node:path";

import { COVERAGE_LIBRARY_FILE_NAME } from "@nomicfoundation/edr";

// Compiler warnings to suppress from build output.
// Supports three types of suppression rules:
//
// 1. scope: 'specific-file' - Suppress warnings from specific file paths
//    - Use this to suppress known warnings from internal/library files (e.g., console.sol)
//    - The same warning type will still be shown for user code
//
// 2. scope: 'test-files' - Suppress warnings from all test files
//    - Test files are identified as:
//      * Files ending in .t.sol (e.g., Counter.t.sol)
//      * Files inside test/contracts/ directory
//        (e.g., test/contracts/Example.sol)
//    - Use this for warnings that are acceptable in test code but not in production code
//      (e.g., missing SPDX license identifiers or pragma statements)
export const SPECIFIC_FILE_RULES: Array<{
  message: string;
  scope: "file-tag";
  filePath: string;
}> = [
  {
    message:
      "Natspec memory-safe-assembly special comment for inline assembly is deprecated and scheduled for removal. Use the memory-safe block annotation instead.",
    scope: "file-tag",
    // Normalize to handle different OS path separators
    filePath: path.normalize("hardhat/console.sol"),
  },
];

export const TEST_FILE_RULES: Array<{
  message: string;
  scope: "test-files";
}> = [
  {
    message: "SPDX license identifier not provided",
    scope: "test-files",
  },
  {
    message: "Source file does not specify required compiler version",
    scope: "test-files",
  },
];

export const COVERAGE_LIBRARY_RULES: Array<{
  scope: "coverage-library";
}> = [
  {
    scope: "coverage-library",
  },
];

export const SUPPRESSED_WARNINGS = [
  ...SPECIFIC_FILE_RULES,
  ...TEST_FILE_RULES,
  ...COVERAGE_LIBRARY_RULES,
];

/**
 * Determines if a compiler warning should be suppressed based on the suppression rules.
 *
 * @param errorMessage - The formatted error message from the compiler
 * @param absoluteSolidityTestsPath - Absolute path to the Solidity test directory
 * @param absoluteProjectRoot - Absolute path to the project root
 * @returns true if the warning should be suppressed, false otherwise
 */
export function shouldSuppressWarning(
  errorMessage: string,
  absoluteSolidityTestsPath: string,
  absoluteProjectRoot: string,
): boolean {
  // Compute relative path from project root to test directory.
  // Example:
  // absoluteSolidityTestsPath: /workspaces/hardhat-4/packages/example-project/test/contracts
  // absoluteProjectRoot:       /workspaces/hardhat-4/packages/example-project
  // relativeTestPath:          test/contracts/ - note the addition of the `/`
  // to avoid partial matches, e.g.: test/contractsUtils/
  const relativeTestPath = path.join(
    path.relative(absoluteProjectRoot, absoluteSolidityTestsPath),
    "/",
  );

  return SUPPRESSED_WARNINGS.some((rule) => {
    if (rule.scope === "coverage-library") {
      return errorMessage.includes(COVERAGE_LIBRARY_FILE_NAME);
    }

    if (!errorMessage.includes(rule.message)) {
      return false;
    }

    if (rule.scope === "specific-file") {
      return errorMessage.includes(rule.filePath);
    }

    // Check if the message contains a path to a test file
    // Test files are identified by:
    // - Ending in .t.sol (e.g., Counter.t.sol)
    // - Being inside the configured Solidity test directory

    if (/\.t\.sol(:|$|\s)/.test(errorMessage)) {
      return true;
    }

    // Extract file path from error message
    // Format: "Warning: message\n  --> path/to/file.sol:line:column:"
    const pathMatches = errorMessage.match(/-->\s+([^\s:]+\.sol)/);

    if (pathMatches !== null) {
      return pathMatches[1].includes(relativeTestPath);
    }

    return false;
  });
}
