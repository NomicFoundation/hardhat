import type { SolidityCompilerType } from "hardhat/types/config";

/**
 * The compiler type identifier registered by this plugin.
 * Typed as SolidityCompilerType for type-safe comparisons.
 */
export const SLANG_COMPILER_TYPE: SolidityCompilerType = "slang";

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

/**
 * A slang release the plugin knows how to download and drive. slang compiles
 * a range of Solidity versions with one binary, so each release maps to an
 * inclusive `[minSolidity, maxSolidity]` range rather than a single version.
 */
export interface SlangRelease {
  /** Lowest Solidity version this release compiles, inclusive. */
  minSolidity: string;
  /** Highest Solidity version this release compiles, inclusive. */
  maxSolidity: string;
  /** CLI arguments passed on every compile, after `--standard-json`. */
  extraArgs: readonly string[];
  /**
   * The asset naming on the mirror, when the release isn't published under
   * the standard `v${version}` suffix.
   */
  assetOverride?: {
    assetSuffix: string;
  };
}

/**
 * The slang releases this plugin can pin via `slang.version`.
 */
// TODO: revisit before release to finalize.
export const SLANG_RELEASES: Record<string, SlangRelease> = {
  "0.1.0-pre.2026-10-14": {
    minSolidity: "0.8.0",
    maxSolidity: "0.8.37",
    extraArgs: ["--no-import-callback"],
    assetOverride: {
      assetSuffix: "debug-fast",
    },
  },
};
