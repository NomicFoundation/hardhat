import { BuidlerConfig, BuidlerNetworkConfig } from "../../../types";
import { BUIDLEREVM_NETWORK_NAME } from "../../constants";

export const BUIDLEREVM_DEFAULT_GAS_PRICE = 8e9;

const DEFAULT_BUIDLER_NETWORK_CONFIG: BuidlerNetworkConfig = {
  hardfork: "istanbul",
  blockGasLimit: 9500000,
  gas: 9500000,
  gasPrice: BUIDLEREVM_DEFAULT_GAS_PRICE,
  chainId: 31337,
  throwOnTransactionFailures: true,
  throwOnCallFailures: true,
  accounts: [
    // 20 accounts with 10k ETH each
    // Addresses:
    //   0xc783df8a850f42e7f7e57013759c285caa701eb6
    //   0xead9c93b79ae7c1591b1fb5323bd777e86e150d4
    //   0xe5904695748fe4a84b40b3fc79de2277660bd1d3
    //   0x92561f28ec438ee9831d00d1d59fbdc981b762b2
    //   0x2ffd013aaa7b5a7da93336c2251075202b33fb2b
    //   0x9fc9c2dfba3b6cf204c37a5f690619772b926e39
    //   0xfbc51a9582d031f2ceaad3959256596c5d3a5468
    //   0x84fae3d3cba24a97817b2a18c2421d462dbbce9f
    //   0xfa3bdc8709226da0da13a4d904c8b66f16c3c8ba
    //   0x6c365935ca8710200c7595f0a72eb6023a7706cd
    //   0xd7de703d9bbc4602242d0f3149e5ffcd30eb3adf
    //   0x532792b73c0c6e7565912e7039c59986f7e1dd1f
    //   0xea960515f8b4c237730f028cbacf0a28e7f45de0
    //   0x3d91185a02774c70287f6c74dd26d13dfb58ff16
    //   0x5585738127d12542a8fd6c71c19d2e4cecdab08a
    //   0x0e0b5a3f244686cf9e7811754379b9114d42f78b
    //   0x704cf59b16fd50efd575342b46ce9c5e07076a4a
    //   0x0a057a7172d0466aef80976d7e8c80647dfd35e3
    //   0x68dfc526037e9030c8f813d014919cc89e7d4d74
    //   0x26c43a1d431a4e5ee86cd55ed7ef9edf3641e901
    {
      privateKey:
        "0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0xd49743deccbccc5dc7baa8e69e5be03298da8688a15dd202e20f15d5e0e9a9fb",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x23c601ae397441f3ef6f1075dcb0031ff17fb079837beadaf3c84d96c6f3e569",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x87630b2d1de0fbd5044eb6891b3d9d98c34c8d310c852f98550ba774480e47cc",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x275cc4a2bfd4f612625204a20a2280ab53a6da2d14860c47a9f5affe58ad86d4",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x7f307c41137d1ed409f0a7b028f6c7596f12734b1d289b58099b99d60a96efff",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x2a8aede924268f84156a00761de73998dac7bf703408754b776ff3f873bcec60",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x8b24fd94f1ce869d81a34b95351e7f97b2cd88a891d5c00abc33d0ec9501902e",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29085",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29086",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29087",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29088",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b29089",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908a",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908b",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908c",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908d",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908e",
      balance: "10000000000000000000000"
    },
    {
      privateKey:
        "0x28d1bfbbafe9d1d4f5a11c3c16ab6bf9084de48d99fbac4058bdfa3c80b2908f",
      balance: "10000000000000000000000"
    }
  ]
};

const defaultConfig: BuidlerConfig = {
  defaultNetwork: BUIDLEREVM_NETWORK_NAME,
  solc: {
    version: require("solc/package.json").version,
    optimizer: {
      enabled: false,
      runs: 200
    }
  },
  networks: {
    [BUIDLEREVM_NETWORK_NAME]: DEFAULT_BUIDLER_NETWORK_CONFIG,
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  },
  analytics: {
    enabled: true
  },
  mocha: {
    timeout: 20000
  }
};

export default defaultConfig;
