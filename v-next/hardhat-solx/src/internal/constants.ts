export const LATEST_KNOWN_SOLX_VERSION = "0.1.3";

export const SOLX_GITHUB_RELEASES_BASE_URL =
  "https://github.com/NomicFoundation/solx/releases/download";

export const SUPPORTED_SOLX_EVM_VERSIONS: readonly string[] = [
  "cancun",
  "prague",
  "osaka",
] as const;

export const DEFAULT_SOLX_SETTINGS: Record<string, unknown> = {
  viaIR: true,
  LLVMOptimization: "1",
};
