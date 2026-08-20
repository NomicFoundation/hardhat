import type { SolidityCompilerType } from "hardhat/types/config";

/**
 * The compiler type identifier registered by this plugin.
 * Typed as SolidityCompilerType for type-safe comparisons.
 */
export const SLANG_SOLX_COMPILER_TYPE: SolidityCompilerType = "slangSolx";

export const SOLX_RELEASES_BASE_URL =
  "https://solx-releases-mirror.hardhat.org";

export const SUPPORTED_SOLX_EVM_VERSIONS: readonly string[] = [
  "cancun",
  "prague",
  "osaka",
] as const;

/**
 * The LLVM optimization levels solx accepts in `settings.optimizer.mode`,
 * lowercase as solx expects. There is no level that turns optimization
 * off: "1" is the minimum.
 */
export const SUPPORTED_SOLX_OPTIMIZER_MODES: readonly string[] = [
  "1",
  "2",
  "3",
  "s",
  "z",
] as const;

/**
 * Default LLVM optimization level, passed to solx via `settings.optimizer.mode`.
 * Deliberately -O1 to optimize for compile speed (solx's own default if
 * unset is -O3).
 */
export const DEFAULT_SOLX_OPTIMIZER_MODE = "1";

/** Maps Solidity versions to the solx version that embeds them. */
export const SOLIDITY_TO_SOLX_VERSION_MAP: Record<string, string> = {
  "0.8.34": "0.1.7",
};
