export const HARDHAT_PACKAGE_NAME = "hardhat";
export const HARDHAT_NAME = "Hardhat";
export const HARDHAT_WEBSITE_URL = "https://hardhat.org/";

// This constant is used to choose the default EVM version for solc versions
// that haven't been defined in ./builtin-plugins/solidity/build-system/solc-info.ts
export const DEFAULT_SOLC_EVM_VERSION = "cancun";

export const HARDHAT_MEMPOOL_SUPPORTED_ORDERS = ["fifo", "priority"] as const;

export const HARDHAT_NETWORK_RESET_EVENT = "hardhatNetworkReset";
export const HARDHAT_NETWORK_REVERT_SNAPSHOT_EVENT =
  "hardhatNetworkRevertSnapshot";
