export const DEFAULT_TEST_PROFILE = "default";

/**
 * The top-level keys of the inline test configuration directives
 * (`forge-config:` / `hardhat-config:`). The first dot-separated segment of a
 * directive is read as a profile name unless it's one of these keys, so a
 * profile named e.g. `fuzz` would make `fuzz.runs = 10` ambiguous.
 *
 * NOTE: This mirrors EDR's inline config keys. If EDR adds a new top-level key,
 * add it here too.
 */
export const RESERVED_TEST_PROFILE_NAMES: readonly string[] = [
  "allowInternalExpectRevert",
  "evmVersion",
  "fuzz",
  "invariant",
  "isolate",
];

/**
 * Profile names are used as prefixes in inline config directives, where the
 * grammar is dot-separated, and on the command line, so we keep them to a
 * conservative character set.
 */
export const TEST_PROFILE_NAME_PATTERN: RegExp = /^[A-Za-z0-9_-]+$/;
