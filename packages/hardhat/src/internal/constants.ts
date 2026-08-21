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
 * collected. Below it, stack traces are produced by re-running the failing
 * test with tracing enabled — much cheaper, but tests with non-deterministic
 * side effects (impure cheatcodes, a fork pinned to `latest`) can't be
 * replayed and report an `UnsafeToReplay` warning instead. Always-on
 * collection records step traces for every test, which balloons memory on
 * large suites, so it's reserved for the highest verbosity.
 */
export const ALWAYS_COLLECT_STACK_TRACES_VERBOSITY = 5;
