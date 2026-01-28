import path from "node:path";

// Compiler warnings to suppress from build output.
// Supports two types of suppression rules:
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
export const SUPPRESSED_WARNINGS: Array<
  | {
      message: string;
      scope: "specific-file";
      filePath: string;
    }
  | {
      message: string;
      scope: "test-files";
    }
> = [
  {
    message:
      "Natspec memory-safe-assembly special comment for inline assembly is deprecated and scheduled for removal. Use the memory-safe block annotation instead.",
    scope: "specific-file",
    // Normalize to handle different OS path separators
    filePath: path.normalize("hardhat/console.sol"),
  },
  {
    message: "SPDX license identifier not provided",
    scope: "test-files",
  },
  {
    message: "Source file does not specify required compiler version",
    scope: "test-files",
  },
];

/**
 * Determines if a compiler warning should be suppressed based on the suppression rules.
 *
 * @param errorMessage - The formatted error message from the compiler
 * @returns true if the warning should be suppressed, false otherwise
 */
export function shouldSuppressWarning(errorMessage: string): boolean {
  return SUPPRESSED_WARNINGS.some((rule) => {
    if (!errorMessage.includes(rule.message)) {
      return false;
    }

    if (rule.scope === "specific-file") {
      return errorMessage.includes(rule.filePath);
    }

    // Check if the message contains a path to a test file
    // Test files are identified by:
    // - Ending in .t.sol (e.g., Counter.t.sol)
    // - Being inside test/contracts/ directory (e.g., test/contracts/Example.sol)
    return (
      /\.t\.sol(:|$|\s)/.test(errorMessage) ||
      /(^|[/\\])test[/\\]contracts[/\\].*\.sol/.test(errorMessage)
    );
  });
}
