import { BuidlerConfig, BuidlerNetworkConfig } from "../../../types";
import { BUIDLEREVM_NETWORK_NAME } from "../../constants";

export const DEFAULT_SOLC_VERSION = "0.5.15";
export const BUIDLEREVM_DEFAULT_GAS_PRICE = 8e9;
const BUIDLER_EVM_MNEMONIC =
  "test test test test test test test test test test test junk";
export const DEFAULT_BUIDLER_NETWORK_BALANCE = "10000000000000000000000";

const DEFAULT_BUIDLER_NETWORK_CONFIG: BuidlerNetworkConfig = {
  hardfork: "istanbul",
  blockGasLimit: 9500000,
  gas: 9500000,
  gasPrice: BUIDLEREVM_DEFAULT_GAS_PRICE,
  chainId: 31337,
  throwOnTransactionFailures: true,
  throwOnCallFailures: true,
  allowUnlimitedContractSize: false,
  accounts: {
    mnemonic: BUIDLER_EVM_MNEMONIC,
    count: 20,
    accountsBalance: DEFAULT_BUIDLER_NETWORK_BALANCE,
  },
};

const defaultConfig: BuidlerConfig = {
  defaultNetwork: BUIDLEREVM_NETWORK_NAME,
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
    [BUIDLEREVM_NETWORK_NAME]: DEFAULT_BUIDLER_NETWORK_CONFIG,
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
