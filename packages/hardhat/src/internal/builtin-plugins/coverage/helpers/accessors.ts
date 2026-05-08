// NOTE: This file is imported from hot paths — the plugin's `created` hook
// handler and task-actions that may run on every `hardhat test` invocation
// regardless of whether the feature is enabled. It must stay lightweight:
// do not add top-level imports that pull in the coverage-manager module
// graph (debug, node:crypto, file-system traversal, etc.), or the
// `--coverage` lazy-load is silently defeated for every caller.
// If a new helper needs a heavy dependency, put it in a sibling file
// (e.g. `helpers/utils.ts`) so the accessors file's import cost stays flat.

import type { HookContext } from "../../../../types/hooks.js";
import type { HardhatRuntimeEnvironment } from "../../../../types/hre.js";
import type { CoverageManager } from "../types.js";

import path from "node:path";

import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";

import { HardhatRuntimeEnvironmentImplementation } from "../../../core/hre.js";

export function getCoveragePath(rootPath: string): string {
  return path.join(rootPath, "coverage");
}

export function getCoverageManager(
  hookContextOrHre: HookContext | HardhatRuntimeEnvironment,
): CoverageManager {
  assertHardhatInvariant(
    hookContextOrHre instanceof HardhatRuntimeEnvironmentImplementation &&
      hookContextOrHre._coverage !== undefined,
    "Expected _coverage to be installed on the HRE",
  );
  return hookContextOrHre._coverage;
}

export function setCoverageManager(
  hre: HardhatRuntimeEnvironment,
  coverageManager: CoverageManager,
): void {
  assertHardhatInvariant(
    hre instanceof HardhatRuntimeEnvironmentImplementation,
    "Expected HRE to be an instance of HardhatRuntimeEnvironmentImplementation",
  );
  hre._coverage = coverageManager;
}
