export const HARDHAT_CONFIG_PREFIX = "hardhat-config:";
export const FORGE_CONFIG_PREFIX = "forge-config:";

/** All supported inline config keys and their expected value types. */
export const KEY_TYPES: Record<string, "number" | "boolean"> = {
  "fuzz.runs": "number",
  "fuzz.maxTestRejects": "number",
  "fuzz.showLogs": "boolean",
  "fuzz.timeout": "number",
  "invariant.runs": "number",
  "invariant.depth": "number",
  "invariant.failOnRevert": "boolean",
  "invariant.callOverride": "boolean",
  "invariant.timeout": "number",
  allowInternalExpectRevert: "boolean",
};

/** Top-level key categories (e.g. "fuzz", "invariant", "allowInternalExpectRevert"). */
export const TOP_LEVEL_KEYS: string[] = [
  ...new Set(Object.keys(KEY_TYPES).map((k) => k.split(".")[0])),
];
