import { HardhatConfig, HardhatNetworkConfig } from "../../../types";
import { HARDHAT_NETWORK_NAME } from "../../constants";

export const DEFAULT_SOLC_VERSION = "0.5.15";
export const HARDHAT_NETWORK_DEFAULT_GAS_PRICE = 8e9;
const HARDHAT_NETWORK_MNEMONIC =
  "test test test test test test test test test test test junk";
export const DEFAULT_HARDHAT_NETWORK_BALANCE = "10000000000000000000000";

const DEFAULT_HARDHAT_NETWORK_CONFIG: HardhatNetworkConfig = {
  hardfork: "istanbul",
  blockGasLimit: 9500000,
  gas: 9500000,
  gasPrice: HARDHAT_NETWORK_DEFAULT_GAS_PRICE,
  chainId: 31337,
  throwOnTransactionFailures: true,
  throwOnCallFailures: true,
  allowUnlimitedContractSize: false,
  accounts: {
    mnemonic: HARDHAT_NETWORK_MNEMONIC,
    count: 20,
    accountsBalance: DEFAULT_HARDHAT_NETWORK_BALANCE,
  },
};

const defaultConfig: HardhatConfig = {
  defaultNetwork: HARDHAT_NETWORK_NAME,
  solidity: {
    version: DEFAULT_SOLC_VERSION,
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },
  networks: {
    [HARDHAT_NETWORK_NAME]: DEFAULT_HARDHAT_NETWORK_CONFIG,
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  analytics: {
    enabled: true,
  },
  mocha: {
    timeout: 20000,
  },
};

export default defaultConfig;
