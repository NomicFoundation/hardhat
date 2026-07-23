export const HARDHAT_PACKAGE_NAME = "hardhat";
export const HARDHAT_NAME = "Hardhat";
export const HARDHAT_WEBSITE_URL = "https://hardhat.org/";

export const EDR_NETWORK_REVERT_SNAPSHOT_EVENT = "hardhatNetworkRevertSnapshot";

export const GENERIC_CHAIN_TYPE = "generic";
export const L1_CHAIN_TYPE = "l1";
export const OPTIMISM_CHAIN_TYPE = "op";

export const DEFAULT_NETWORK_NAME = "default";

export const DEFAULT_VERBOSITY = 2;

/**
 * The verbosity level (`-vvvvv`) at and above which stack traces are always
 * collected (`CollectStackTraces.Always`).
 *
 * Below it, stack traces for failing tests are produced lazily: the failing
 * test is re-executed with tracing enabled. That is much cheaper, but it can't
 * reproduce tests with non-deterministic side effects (impure cheatcodes, or a
 * fork pinned to `latest`), which report an `UnsafeToReplay` warning instead of
 * a stack trace. `Always` guarantees a trace for those too, but makes the EDR
 * runner record per-opcode step traces for every test, which balloons memory on
 * large suites — so we only opt into it at the highest verbosity.
 */
export const ALWAYS_COLLECT_STACK_TRACES_VERBOSITY = 5;
