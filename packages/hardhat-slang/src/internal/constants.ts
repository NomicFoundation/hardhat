import type { SolidityCompilerType } from "hardhat/types/config";

/**
 * The compiler type identifier registered by this plugin.
 * Typed as SolidityCompilerType for type-safe comparisons.
 */
export const SLANG_COMPILER_TYPE: SolidityCompilerType = "slang";

// TODO: revisit before release to finalize.
export const SLANG_RELEASES_BASE_URL =
  "https://solx-releases-mirror.hardhat.org";

export const SUPPORTED_SLANG_EVM_VERSIONS: readonly string[] = [
  "cancun",
  "prague",
  "osaka",
] as const;

/**
 * The LLVM optimization levels slang accepts in `settings.optimizer.mode`,
 * lowercase as slang expects. There is no level that turns optimization
 * off: "1" is the minimum.
 */
export const SUPPORTED_SLANG_OPTIMIZER_MODES: readonly string[] = [
  "1",
  "2",
  "3",
  "s",
  "z",
] as const;

/**
 * Default LLVM optimization level, passed to slang via `settings.optimizer.mode`.
 * Deliberately -O1 to optimize for compile speed (slang's own default if
 * unset is -O3).
 */
export const DEFAULT_SLANG_OPTIMIZER_MODE = "1";

/** Maps Solidity versions to the slang version that embeds them. */
export const SOLIDITY_TO_SOLX_VERSION_MAP: Record<string, string> = {
  "0.8.34": "0.1.8",
};
