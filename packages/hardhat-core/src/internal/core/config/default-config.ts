import { BN } from "ethereumjs-util";

import { HardhatNetworkConfig } from "../../../types";
import { HARDHAT_NETWORK_NAME } from "../../constants";

export const DEFAULT_SOLC_VERSION = "0.7.3";
export const HARDHAT_NETWORK_DEFAULT_GAS_PRICE = 8e9;
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
  hardfork: "berlin",
  blockGasLimit: 12450000,
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
