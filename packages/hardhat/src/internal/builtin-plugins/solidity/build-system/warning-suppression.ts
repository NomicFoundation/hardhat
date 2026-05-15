import path from "node:path";

import { COVERAGE_LIBRARY_FILE_NAME } from "@nomicfoundation/edr";

export const NATSPEC_MEMORY_SAFE_ASSEMBLY_WARNING =
  "Natspec memory-safe-assembly special comment for inline assembly is deprecated and scheduled for removal. Use the memory-safe block annotation instead.";
export const SPDX_WARNING = "SPDX license identifier not provided";
export const PRAGMA_WARNING =
  "Source file does not specify required compiler version";
const CONTRACT_SIZE_WARNING = "Contract code size is";

// Suppression rules are grouped by scope. Each array has its own match logic
// in `shouldSuppressWarning` function; add new entries to the array that fits, or add
// a new array + block for a new scope.

// Warnings tied to a specific internal file (e.g. console.sol). Suppressed
// only when the warning points at that file.
const SPECIFIC_FILE_RULES: ReadonlyArray<{
  message: string;
  filePath: string;
}> = [
  {
    message: NATSPEC_MEMORY_SAFE_ASSEMBLY_WARNING,
    // Normalize to handle different OS path separators
    filePath: path.normalize("hardhat/console.sol"),
  },
];

// Warnings acceptable in test files. Suppressed when the warning points at a
// file ending in `.t.sol` or inside the configured Solidity test directory.
const TEST_FILE_WARNING_MESSAGES: readonly string[] = [
  SPDX_WARNING,
  PRAGMA_WARNING,
];

// Warnings that fire against user files only as a side effect of coverage
// instrumentation. Suppressed only when running with `--coverage` so the same
// warnings still surface in regular builds.
const COVERAGE_MODE_WARNING_MESSAGES: readonly string[] = [
  CONTRACT_SIZE_WARNING,
];

/**
 * Determines if a compiler warning should be suppressed.
 *
 * @param errorMessage - The formatted error message from the compiler
 * @param absoluteSolidityTestsPath - Absolute path to the Solidity test directory
 * @param absoluteProjectRoot - Absolute path to the project root
 * @param coverage - Whether the build is running with `--coverage` enabled
 * @returns true if the warning should be suppressed, false otherwise
 */
export function shouldSuppressWarning(
  errorMessage: string,
  absoluteSolidityTestsPath: string,
  absoluteProjectRoot: string,
  coverage: boolean,
): boolean {
  // Coverage library file: injected by the --coverage hook; users can't edit
  // it. Always suppress; the file only exists when coverage is enabled.
  if (errorMessage.includes(COVERAGE_LIBRARY_FILE_NAME)) {
    return true;
  }

  // Coverage-only side effects on user files
  if (
    coverage &&
    COVERAGE_MODE_WARNING_MESSAGES.some((m) => errorMessage.includes(m))
  ) {
    return true;
  }

  // Warnings tied to a specific internal file (e.g. console.sol).
  if (
    SPECIFIC_FILE_RULES.some(
      (rule) =>
        errorMessage.includes(rule.message) &&
        errorMessage.includes(rule.filePath),
    )
  ) {
    return true;
  }

  // Warnings allowed in test files.
  if (TEST_FILE_WARNING_MESSAGES.some((m) => errorMessage.includes(m))) {
    // Test files are identified by:
    // - Ending in .t.sol (e.g., Counter.t.sol)
    // - Being inside the configured Solidity test directory
    if (/\.t\.sol(:|$|\s)/.test(errorMessage)) {
      return true;
    }

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

    // Extract file path from error message.
    // Format: "Warning: message\n  --> path/to/file.sol:line:column:"
    const pathMatches = errorMessage.match(/-->\s+([^\s:]+\.sol)/);
    if (pathMatches !== null) {
      return pathMatches[1].includes(relativeTestPath);
    }
  }

  return false;
}
