import { exec } from "node:child_process";
import * as path from "node:path";
import { promisify } from "node:util";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { exists } from "@nomicfoundation/hardhat-utils/fs";

const execAsync = promisify(exec);

const FORGE_TIMEOUT_MS = 500;
const FORGE_VERSION_TIMEOUT_MS = 500; // 0.5 seconds

// Type for the exec function (used for dependency injection in tests)
export type ExecAsyncFn = (
  command: string,
  options?: any,
) => Promise<{ stdout: string; stderr: string }>;

// Module-level mock for testing
let execMock: ExecAsyncFn | undefined;

/**
 * Set a mock exec function for testing.
 * @param mockExec - The mock exec function to use.
 */
export function setExecMock(mockExec: ExecAsyncFn): void {
  execMock = mockExec;
}

/**
 * Reset the mock exec function.
 */
export function resetExecMock(): void {
  execMock = undefined;
}

/**
 * Check if a package has a foundry.toml configuration file.
 *
 * @param packagePath - The absolute filesystem path to the package root.
 * @returns True if foundry.toml exists in the package.
 */
export async function hasFoundryConfig(packagePath: string): Promise<boolean> {
  const foundryTomlPath = path.join(packagePath, "foundry.toml");
  return exists(foundryTomlPath);
}

/**
 * Check if forge is installed and available in PATH.
 *
 * @returns True if forge is installed, false otherwise.
 */
export async function isForgeInstalled(): Promise<boolean> {
  const _execAsync: ExecAsyncFn = execMock ?? execAsync;
  try {
    await _execAsync("forge --version", { timeout: FORGE_VERSION_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

/**
 * Execute `forge remappings` in the given package directory to get Solidity remappings.
 *
 * @param packagePath - The absolute filesystem path to the package root.
 * @returns An array of remapping strings (e.g., ["@openzeppelin/=lib/openzeppelin-contracts/"]).
 * @throws {HardhatError} If the command fails.
 */
export async function getForgeRemappings(
  packagePath: string,
): Promise<string[]> {
  const _execAsync: ExecAsyncFn = execMock ?? execAsync;

  try {
    const { stdout, stderr } = await _execAsync("forge remappings", {
      cwd: packagePath,
      timeout: FORGE_TIMEOUT_MS,
      env: process.env,
    });

    // If there's stderr output but no stdout, it might be an error
    if (stderr.length > 0 && stdout.length === 0) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_FOUNDRY.GENERAL.FORGE_REMAPPINGS_FAILED,
        { packagePath, stderr: stderr.trim() },
      );
    }

    // Parse the output into individual remappings
    const remappings = stdout
      .split(/\r?\n/) // Handle both Unix and Windows line endings
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return remappings;
  } catch (error) {
    ensureError(error);

    // Re-throw HardhatErrors as-is, as it's a FORGE_REMAPPINGS_FAILED error
    if (HardhatError.isHardhatError(error)) {
      throw error;
    }

    const errorMessage =
      "stderr" in error &&
      typeof error.stderr === "string" &&
      error.stderr.length > 0
        ? error.stderr
        : error.message;

    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_FOUNDRY.GENERAL.FORGE_REMAPPINGS_FAILED,
      { packagePath, stderr: errorMessage },
    );
  }
}
