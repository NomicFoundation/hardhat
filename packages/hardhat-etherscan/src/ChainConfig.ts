import { ChainConfig } from "./types";

// See https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md#list-of-chain-ids
export const chainConfig: ChainConfig = {
  mainnet: {
    chainId: 1,
    urls: {
      apiURL: "https://api.etherscan.io/api",
      browserURL: "https://etherscan.io",
    },
  },
  ropsten: {
    chainId: 3,
    urls: {
      apiURL: "https://api-ropsten.etherscan.io/api",
      browserURL: "https://ropsten.etherscan.io",
    },
  },
  rinkeby: {
    chainId: 4,
    urls: {
      apiURL: "https://api-rinkeby.etherscan.io/api",
      browserURL: "https://rinkeby.etherscan.io",
    },
  },
  goerli: {
    chainId: 5,
    urls: {
      apiURL: "https://api-goerli.etherscan.io/api",
      browserURL: "https://goerli.etherscan.io",
    },
  },
  kovan: {
    chainId: 42,
    urls: {
      apiURL: "https://api-kovan.etherscan.io/api",
      browserURL: "https://kovan.etherscan.io",
    },
  },
  sepolia: {
    chainId: 11155111,
    urls: {
      apiURL: "https://api-sepolia.etherscan.io/api",
      browserURL: "https://sepolia.etherscan.io",
    },
  },
  bsc: {
    chainId: 56,
    urls: {
      apiURL: "https://api.bscscan.com/api",
      browserURL: "https://bscscan.com",
    },
  },
  bscTestnet: {
    chainId: 97,
    urls: {
      apiURL: "https://api-testnet.bscscan.com/api",
      browserURL: "https://testnet.bscscan.com",
    },
  },
  heco: {
    chainId: 128,
    urls: {
      apiURL: "https://api.hecoinfo.com/api",
      browserURL: "https://hecoinfo.com",
    },
  },
  hecoTestnet: {
    chainId: 256,
    urls: {
      apiURL: "https://api-testnet.hecoinfo.com/api",
      browserURL: "https://testnet.hecoinfo.com",
    },
  },
  opera: {
    chainId: 250,
    urls: {
      apiURL: "https://api.ftmscan.com/api",
      browserURL: "https://ftmscan.com",
    },
  },
  ftmTestnet: {
    chainId: 4002,
    urls: {
      apiURL: "https://api-testnet.ftmscan.com/api",
      browserURL: "https://testnet.ftmscan.com",
    },
  },
  optimisticEthereum: {
    chainId: 10,
    urls: {
      apiURL: "https://api-optimistic.etherscan.io/api",
      browserURL: "https://optimistic.etherscan.io/",
    },
  },
  optimisticGoerli: {
    chainId: 420,
    urls: {
      apiURL: "https://api-goerli-optimism.etherscan.io/api",
      browserURL: "https://goerli-optimism.etherscan.io/",
    },
  },
  polygon: {
    chainId: 137,
    urls: {
      apiURL: "https://api.polygonscan.com/api",
      browserURL: "https://polygonscan.com",
    },
  },
  polygonMumbai: {
    chainId: 80001,
    urls: {
      apiURL: "https://api-testnet.polygonscan.com/api",
      browserURL: "https://mumbai.polygonscan.com/",
    },
  },
  arbitrumOne: {
    chainId: 42161,
    urls: {
      apiURL: "https://api.arbiscan.io/api",
      browserURL: "https://arbiscan.io/",
    },
  },
  arbitrumGoerli: {
    chainId: 421613,
    urls: {
      apiURL: "https://api-goerli.arbiscan.io/api",
      browserURL: "https://goerli.arbiscan.io/",
    },
  },
  arbitrumTestnet: {
    chainId: 421611,
    urls: {
      apiURL: "https://api-testnet.arbiscan.io/api",
      browserURL: "https://testnet.arbiscan.io/",
    },
  },
  avalanche: {
    chainId: 43114,
    urls: {
      apiURL: "https://api.snowtrace.io/api",
      browserURL: "https://snowtrace.io/",
    },
  },
  avalancheFujiTestnet: {
    chainId: 43113,
    urls: {
      apiURL: "https://api-testnet.snowtrace.io/api",
      browserURL: "https://testnet.snowtrace.io/",
    },
  },
  moonbeam: {
    chainId: 1284,
    urls: {
      apiURL: "https://api-moonbeam.moonscan.io/api",
      browserURL: "https://moonbeam.moonscan.io",
    },
  },
  moonriver: {
    chainId: 1285,
    urls: {
      apiURL: "https://api-moonriver.moonscan.io/api",
      browserURL: "https://moonriver.moonscan.io",
    },
  },
  moonbaseAlpha: {
    chainId: 1287,
    urls: {
      apiURL: "https://api-moonbase.moonscan.io/api",
      browserURL: "https://moonbase.moonscan.io/",
    },
  },
  xdai: {
    chainId: 100,
    urls: {
      apiURL: "https://api.gnosisscan.io/api",
      browserURL: "https://gnosisscan.io",
    },
  },
  gnosis: {
    chainId: 100,
    urls: {
      apiURL: "https://api.gnosisscan.io/api",
      browserURL: "https://gnosisscan.io",
    },
  },
  chiado: {
    chainId: 10200,
    urls: {
      apiURL: "https://blockscout.chiadochain.net/api",
      browserURL: "https://blockscout.chiadochain.net",
    },
  },
  sokol: {
    chainId: 77,
    urls: {
      apiURL: "https://blockscout.com/poa/sokol/api",
      browserURL: "https://blockscout.com/poa/sokol",
    },
  },
  aurora: {
    chainId: 1313161554,
    urls: {
      apiURL: "https://api.aurorascan.dev/api",
      browserURL: "https://aurorascan.dev/",
    },
  },
  auroraTestnet: {
    chainId: 1313161555,
    urls: {
      apiURL: "https://api-testnet.aurorascan.dev/api",
      browserURL: "https://testnet.aurorascan.dev",
    },
  },
  harmony: {
    chainId: 1666600000,
    urls: {
      apiURL: "https://ctrver.t.hmny.io/verify",
      browserURL: "https://explorer.harmony.one",
    },
  },
  harmonyTest: {
    chainId: 1666700000,
    urls: {
      apiURL: "https://ctrver.t.hmny.io/verify?network=testnet",
      browserURL: "https://explorer.pops.one",
    },
  },
  // We are not adding new networks to the core of hardhat-etherscan anymore.
  // Please read this to learn how to manually add support for custom networks:
  // https://github.com/NomicFoundation/hardhat/tree/main/packages/hardhat-etherscan#adding-support-for-other-networks
};
