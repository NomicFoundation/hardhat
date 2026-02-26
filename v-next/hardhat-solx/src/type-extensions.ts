import "hardhat/types/config";

declare module "hardhat/types/config" {
  export interface SolxUserConfig {
    /** solx version to download (e.g., "0.1.3"). Default: latest known version. */
    version?: string;
    /**
     * Extra settings to merge into the standard-json input's `settings` object.
     * Use this for solx-specific settings like `{ LLVMOptimization: "1" }`.
     */
    settings?: Record<string, unknown>;
  }

  export interface SolxConfig {
    version: string;
    settings: Record<string, unknown>;
  }

  export interface HardhatUserConfig {
    solx?: SolxUserConfig;
  }

  export interface HardhatConfig {
    solx: SolxConfig;
  }
}
