import { BN } from "ethereumjs-util";

import {
  HardforkActivationsByChain,
  HardhatNetworkConfig,
} from "../../../types";
import { HARDHAT_NETWORK_NAME } from "../../constants";

export const DEFAULT_SOLC_VERSION = "0.7.3";
export const HARDHAT_NETWORK_DEFAULT_GAS_PRICE = "auto";
export const HARDHAT_NETWORK_DEFAULT_MAX_PRIORITY_FEE_PER_GAS = 1e9;
export const HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS = 1e9;
const HARDHAT_NETWORK_MNEMONIC =
  "test test test test test test test test test test test junk";
export const DEFAULT_HARDHAT_NETWORK_BALANCE = "10000000000000000000000";

export const defaultDefaultNetwork = HARDHAT_NETWORK_NAME;

export const defaultLocalhostNetworkParams = {
  url: "http://127.0.0.1:8545",
};

export const defaultHdAccountsConfigParams = {
  initialIndex: 0,
  count: 20,
  path: "m/44'/60'/0'/0",
};

export const defaultHardhatNetworkHdAccountsConfigParams = {
  ...defaultHdAccountsConfigParams,
  mnemonic: HARDHAT_NETWORK_MNEMONIC,
  accountsBalance: DEFAULT_HARDHAT_NETWORK_BALANCE,
};

export const DEFAULT_GAS_MULTIPLIER = 1;

export const defaultHardhatNetworkParams: Omit<
  HardhatNetworkConfig,
  "gas" | "initialDate"
> = {
  hardfork: "london",
  blockGasLimit: 30_000_000,
  gasPrice: HARDHAT_NETWORK_DEFAULT_GAS_PRICE,
  chainId: 31337,
  throwOnTransactionFailures: true,
  throwOnCallFailures: true,
  allowUnlimitedContractSize: false,
  mining: { auto: true, interval: 0 },
  accounts: defaultHardhatNetworkHdAccountsConfigParams,
  loggingEnabled: false,
  gasMultiplier: DEFAULT_GAS_MULTIPLIER,
  minGasPrice: new BN(0),
};

export const defaultHttpNetworkParams = {
  accounts: "remote" as "remote",
  gas: "auto" as "auto",
  gasPrice: "auto" as "auto",
  gasMultiplier: DEFAULT_GAS_MULTIPLIER,
  httpHeaders: {},
  timeout: 20000,
};

export const defaultMochaOptions: Mocha.MochaOptions = {
  timeout: 20000,
};

export const defaultSolcOutputSelection = {
  "*": {
    "*": [
      "abi",
      "evm.bytecode",
      "evm.deployedBytecode",
      "evm.methodIdentifiers",
    ],
    "": ["ast"],
  },
};

export const defaultHardforkActivationsByChain: HardforkActivationsByChain = {
  // mainnet:
  1: {
    byzantium: 4370000,
    constantinople: 7280000,
    petersburg: 7280000,
    istanbul: 9069000,
    muirGlacier: 9200000,
    berlin: 12244000,
    london: 12965000,
  },
  // ropsten:
  3: {
    byzantium: 1700000,
    constantinople: 4230000,
    petersburg: 4939394,
    istanbul: 6485846,
    muirGlacier: 7117117,
    berlin: 9812189,
    london: 10499401,
  },
  // rinkeby:
  4: {
    byzantium: 1035301,
    constantinople: 3660663,
    petersburg: 4321234,
    istanbul: 5435345,
    berlin: 8290928,
    london: 8897988,
  },
  // kovan:
  42: {
    byzantium: 5067000,
    constantinople: 9200000,
    petersburg: 10255201,
    istanbul: 14111141,
  },
};
