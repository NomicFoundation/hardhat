import { HardhatNetworkConfig } from "../../../types";
import { HardforkName } from "../../util/hardforks";
import { HARDHAT_NETWORK_NAME } from "../../constants";

export const DEFAULT_SOLC_VERSION = "0.7.3";
export const HARDHAT_NETWORK_DEFAULT_GAS_PRICE = "auto";
export const HARDHAT_NETWORK_DEFAULT_MAX_PRIORITY_FEE_PER_GAS = 1e9;
export const HARDHAT_NETWORK_DEFAULT_INITIAL_BASE_FEE_PER_GAS = 1e9;
export const HARDHAT_NETWORK_MNEMONIC =
  "test test test test test test test test test test test junk";
export const DEFAULT_HARDHAT_NETWORK_BALANCE = "10000000000000000000000";

export const defaultDefaultNetwork = HARDHAT_NETWORK_NAME;

export const defaultLocalhostNetworkParams = {
  url: "http://127.0.0.1:8545",
  timeout: 40000,
};

export const defaultHdAccountsConfigParams = {
  initialIndex: 0,
  count: 20,
  path: "m/44'/60'/0'/0",
  passphrase: "",
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
  hardfork: "arrowGlacier",
  blockGasLimit: 30_000_000n,
  gasPrice: HARDHAT_NETWORK_DEFAULT_GAS_PRICE,
  chainId: 31337,
  throwOnTransactionFailures: true,
  throwOnCallFailures: true,
  allowUnlimitedContractSize: false,
  mining: {
    auto: true,
    interval: 0,
    mempool: {
      order: "priority",
    },
  },
  accounts: defaultHardhatNetworkHdAccountsConfigParams,
  loggingEnabled: false,
  gasMultiplier: DEFAULT_GAS_MULTIPLIER,
  minGasPrice: 0n,
  chains: new Map([
    [
      // block numbers below were taken from https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/common/src/chains
      1, // mainnet
      {
        hardforkHistory: new Map([
          [HardforkName.BYZANTIUM, 4370000n],
          [HardforkName.CONSTANTINOPLE, 7280000n],
          [HardforkName.PETERSBURG, 7280000n],
          [HardforkName.ISTANBUL, 9069000n],
          [HardforkName.MUIR_GLACIER, 9200000n],
          [HardforkName.BERLIN, 12244000n],
          [HardforkName.LONDON, 12965000n],
        ]),
      },
    ],
    [
      3, // ropsten
      {
        hardforkHistory: new Map([
          [HardforkName.BYZANTIUM, 1700000n],
          [HardforkName.CONSTANTINOPLE, 4230000n],
          [HardforkName.PETERSBURG, 4939394n],
          [HardforkName.ISTANBUL, 6485846n],
          [HardforkName.MUIR_GLACIER, 7117117n],
          [HardforkName.BERLIN, 9812189n],
          [HardforkName.LONDON, 10499401n],
        ]),
      },
    ],
    [
      4, // rinkeby
      {
        hardforkHistory: new Map([
          [HardforkName.BYZANTIUM, 1035301n],
          [HardforkName.CONSTANTINOPLE, 3660663n],
          [HardforkName.PETERSBURG, 4321234n],
          [HardforkName.ISTANBUL, 5435345n],
          [HardforkName.BERLIN, 8290928n],
          [HardforkName.LONDON, 8897988n],
        ]),
      },
    ],
    [
      42, // kovan
      {
        hardforkHistory: new Map([
          [HardforkName.BYZANTIUM, 5067000n],
          [HardforkName.CONSTANTINOPLE, 9200000n],
          [HardforkName.PETERSBURG, 10255201n],
          [HardforkName.ISTANBUL, 14111141n],
          [HardforkName.BERLIN, 24770900n],
          [HardforkName.LONDON, 26741100n],
        ]),
      },
    ],
  ]),
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
  timeout: 40000,
};

export const defaultSolcOutputSelection = {
  "*": {
    "*": [
      "abi",
      "evm.bytecode",
      "evm.deployedBytecode",
      "evm.methodIdentifiers",
      "metadata",
    ],
    "": ["ast"],
  },
};
