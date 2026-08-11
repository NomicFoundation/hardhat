import type { SolidityCompilerType } from "hardhat/types/config";

/**
 * The compiler type identifier registered by this plugin, and the one users
 * write in their config.
 * Typed as SolidityCompilerType for type-safe comparisons.
 */
export const SLANG_SOLX_COMPILER_TYPE: SolidityCompilerType = "slangSolx";

/**
 * The compiler type the resolved config carries, which is the name of the
 * compiler that actually runs.
 *
 * EDR decides how to read a build info from its `compilerType` field, and only
 * recognizes `"solc"` and `"solx"`. An unrecognized value falls back to
 * `"solc"`, where EDR looks for the `sourceMap` that solx does not emit, and
 * Solidity stack traces are silently lost. So the plugin rewrites
 * `"slangSolx"` to `"solx"` as it resolves each compiler entry, while users
 * keep writing {@link SLANG_SOLX_COMPILER_TYPE}.
 *
 * Remove this translation once EDR recognizes `"slangSolx"`.
 */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
this is EDR's name for the compiler, not a type this plugin registers, so it
is deliberately not part of SolidityCompilerTypeDefinitions */
export const RESOLVED_SOLX_COMPILER_TYPE = "solx" as SolidityCompilerType;

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
