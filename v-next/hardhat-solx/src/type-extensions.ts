import "hardhat/types/config";

declare module "hardhat/types/config" {
  export interface SolxUserConfig {
    /** solx binary version to download (e.g., "0.1.3"). Default: latest known version. */
    version?: string;
    /**
     * Extra settings merged into the standard-json input at compile time.
     * Default: `{ viaIR: true, LLVMOptimization: "1" }`.
     */
    settings?: Record<string, unknown>;
    /**
     * Allow compiler type `"solx"` in the production build profile.
     * By default, solx in production is rejected as a safeguard.
     */
    dangerouslyAllowSolxInProduction?: boolean;
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
