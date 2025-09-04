import type { ChainDescriptorsConfig } from "../../../types/config.js";

import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../constants.js";

export const DEFAULT_CHAIN_DESCRIPTORS: ChainDescriptorsConfig = new Map([
  // ethereum mainnet
  [
    1n,
    {
      name: "Ethereum",
      chainType: L1_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          url: "https://etherscan.io",
          apiUrl: "https://api.etherscan.io/api",
        },
        blockscout: {
          url: "https://eth.blockscout.com",
          apiUrl: "https://eth.blockscout.com/api",
        },
      },
    },
  ],
  // holesky testnet
  [
    17_000n,
    {
      name: "Holesky",
      chainType: L1_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          url: "https://holesky.etherscan.io",
          apiUrl: "https://api-holesky.etherscan.io/api",
        },
        blockscout: {
          url: "https://eth-holesky.blockscout.com",
          apiUrl: "https://eth-holesky.blockscout.com/api",
        },
      },
    },
  ],
  // hoodi testnet
  [
    560_048n,
    {
      name: "Hoodi",
      chainType: L1_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          url: "https://hoodi.etherscan.io",
          apiUrl: "https://api-hoodi.etherscan.io/api",
        },
        blockscout: {
          url: "https://eth-hoodi.blockscout.com",
          apiUrl: "https://eth-hoodi.blockscout.com/api",
        },
      },
    },
  ],
  // sepolia testnet
  [
    11_155_111n,
    {
      name: "Sepolia",
      chainType: L1_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          url: "https://sepolia.etherscan.io",
          apiUrl: "https://api-sepolia.etherscan.io/api",
        },
        blockscout: {
          url: "https://eth-sepolia.blockscout.com",
          apiUrl: "https://eth-sepolia.blockscout.com/api",
        },
      },
    },
  ],
  // optimism mainnet
  [
    10n,
    {
      name: "OP Mainnet",
      chainType: OPTIMISM_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          url: "https://optimistic.etherscan.io",
          apiUrl: "https://api-optimistic.etherscan.io/api",
        },
        blockscout: {
          url: "https://optimism.blockscout.com",
          apiUrl: "https://optimism.blockscout.com/api",
        },
      },
    },
  ],
  // optimism sepolia testnet
  [
    11_155_420n,
    {
      name: "OP Sepolia",
      chainType: OPTIMISM_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          url: "https://sepolia-optimism.etherscan.io",
          apiUrl: "https://api-sepolia-optimism.etherscan.io/api",
        },
        blockscout: {
          url: "https://optimism-sepolia.blockscout.com",
          apiUrl: "https://optimism-sepolia.blockscout.com/api",
        },
      },
    },
  ],
  // arbitrum one mainnet
  [
    42_161n,
    {
      name: "Arbitrum One",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "Arbiscan",
          url: "https://arbiscan.io",
          apiUrl: "https://api.arbiscan.io/api",
        },
        blockscout: {
          url: "https://arbitrum.blockscout.com",
          apiUrl: "https://arbitrum.blockscout.com/api",
        },
      },
    },
  ],
  // arbitrum nova mainnet
  [
    42_170n,
    {
      name: "Arbitrum Nova",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "Arbiscan",
          url: "https://nova.arbiscan.io",
          apiUrl: "https://api-nova.arbiscan.io/api",
        },
        blockscout: {
          url: "https://arbitrum-nova.blockscout.com",
          apiUrl: "https://arbitrum-nova.blockscout.com/api",
        },
      },
    },
  ],
  // arbitrum sepolia testnet
  [
    42_170n,
    {
      name: "Arbitrum Sepolia",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "Arbiscan",
          url: "https://sepolia.arbiscan.io",
          apiUrl: "https://api-sepolia.arbiscan.io/api",
        },
        blockscout: {
          url: "https://arbitrum-sepolia.blockscout.com",
          apiUrl: "https://arbitrum-sepolia.blockscout.com/api",
        },
      },
    },
  ],
  // base mainnet
  [
    8_453n,
    {
      name: "Base",
      chainType: OPTIMISM_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "Basescan",
          url: "https://basescan.org",
          apiUrl: "https://api.basescan.org/api",
        },
        blockscout: {
          url: "https://base.blockscout.com",
          apiUrl: "https://base.blockscout.com/api",
        },
      },
    },
  ],
  // base sepolia testnet
  [
    84_532n,
    {
      name: "Base Sepolia",
      chainType: OPTIMISM_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "Basescan",
          url: "https://sepolia.basescan.org",
          apiUrl: "https://api-sepolia.basescan.org/api",
        },
        blockscout: {
          url: "https://base-sepolia.blockscout.com",
          apiUrl: "https://base-sepolia.blockscout.com/api",
        },
      },
    },
  ],
  // avalanche mainnet
  [
    43_114n,
    {
      name: "Avalanche",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "SnowTrace",
          url: "https://snowtrace.io",
          apiUrl: "https://api.snowtrace.io/api",
        },
      },
    },
  ],
  // avalanche fuji testnet
  [
    43_113n,
    {
      name: "Avalanche Fuji",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "SnowTrace",
          url: "https://testnet.snowtrace.io",
          apiUrl: "https://api-testnet.snowtrace.io/api",
        },
      },
    },
  ],
  // polygon mainnet
  [
    137n,
    {
      name: "Polygon",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "PolygonScan",
          url: "https://polygonscan.com",
          apiUrl: "https://api.polygonscan.com/api",
        },
        blockscout: {
          url: "https://polygon.blockscout.com",
          apiUrl: "https://polygon.blockscout.com/api",
        },
      },
    },
  ],
  // polygon amoy testnet
  [
    80_002n,
    {
      name: "Polygon Amoy",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "PolygonScan",
          url: "https://amoy.polygonscan.com",
          apiUrl: "https://api-amoy.polygonscan.com/api",
        },
      },
    },
  ],
  // polygon zkevm mainnet
  [
    1_101n,
    {
      name: "Polygon zkEVM",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "PolygonScan",
          url: "https://zkevm.polygonscan.com",
          apiUrl: "https://api-zkevm.polygonscan.com/api",
        },
        blockscout: {
          url: "https://zkevm.blockscout.com",
          apiUrl: "https://zkevm.blockscout.com/api",
        },
      },
    },
  ],
  // polygon zkevm cardona testnet
  [
    2_442n,
    {
      name: "Polygon zkEVM Cardona",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "PolygonScan",
          url: "https://cardona-zkevm.polygonscan.com",
          apiUrl: "https://api-cardona-zkevm.polygonscan.com/api",
        },
      },
    },
  ],
  // zksync era mainnet
  [
    324n,
    {
      name: "ZKsync Era",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "zkSync Era Explorer",
          url: "https://era.zksync.network",
          apiUrl: "https://api-era.zksync.network/api",
        },
        blockscout: {
          url: "https://zksync.blockscout.com",
          apiUrl: "https://zksync.blockscout.com/api",
        },
      },
    },
  ],
  // zksync sepolia testnet
  [
    300n,
    {
      name: "ZKsync Sepolia Testnet",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "zkSync Era Explorer",
          url: "https://sepolia-era.zksync.network",
          apiUrl: "https://sepolia-era.zksync.network/api",
        },
        blockscout: {
          url: "https://zksync-sepolia.blockscout.com",
          apiUrl: "https://zksync-sepolia.blockscout.com/api",
        },
      },
    },
  ],
  // binance smart chain mainnet
  [
    56n,
    {
      name: "Binance Smart Chain",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "BscScan",
          url: "https://bscscan.com",
          apiUrl: "https://api.bscscan.com/api",
        },
      },
    },
  ],
  // binance smart chain testnet
  [
    97n,
    {
      name: "Binance Smart Chain Testnet",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "BscScan",
          url: "https://testnet.bscscan.com",
          apiUrl: "https://api-testnet.bscscan.com/api",
        },
      },
    },
  ],
  // gnosis mainnet
  [
    100n,
    {
      name: "Gnosis",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "Gnosisscan",
          url: "https://gnosisscan.io",
          apiUrl: "https://api.gnosisscan.com/api",
        },
        blockscout: {
          url: "https://gnosis.blockscout.com",
          apiUrl: "https://gnosis.blockscout.com/api",
        },
      },
    },
  ],
  // gnosis chiado testnet
  [
    10_200n,
    {
      name: "Gnosis Chiado",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        blockscout: {
          url: "https://gnosis-chiado.blockscout.com",
          apiUrl: "https://gnosis-chiado.blockscout.com/api",
        },
      },
    },
  ],
  // fantom mainnet
  [
    250n,
    {
      name: "Fantom",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        blockscout: {
          name: "FTMScout",
          url: "https://ftmscout.com",
          apiUrl: "https://ftmscout.com/api",
        },
      },
    },
  ],
  // moonbeam mainnet
  [
    1_284n,
    {
      name: "Moonbeam",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "Moonscan",
          url: "https://moonbeam.moonscan.io",
          apiUrl: "https://api-moonbeam.moonscan.io/api",
        },
      },
    },
  ],
  // moonbeam moonbase alpha testnet
  [
    1_287n,
    {
      name: "Moonbase Alpha",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "Moonscan",
          url: "https://moonbase.moonscan.io",
          apiUrl: "https://api-moonbase.moonscan.io/api",
        },
      },
    },
  ],
  // moonriver mainnet
  [
    1_285n,
    {
      name: "Moonriver",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "Moonscan",
          url: "https://moonriver.moonscan.io",
          apiUrl: "https://api-moonriver.moonscan.io/api",
        },
      },
    },
  ],
  // ink mainnet
  [
    57_073n,
    {
      name: "Ink",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        blockscout: {
          url: "https://explorer.inkonchain.com",
          apiUrl: "https://explorer.inkonchain.com/api",
        },
      },
    },
  ],
  // linea sepolia testnet
  [
    59_141n,
    {
      name: "Linea Sepolia",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "LineaScan",
          url: "https://sepolia.lineascan.build",
          apiUrl: "https://api-sepolia.lineascan.build/api",
        },
        blockscout: {
          url: "https://explorer.sepolia.linea.build",
          apiUrl: "https://api-explorer.sepolia.linea.build/api",
        },
      },
    },
  ],
  // linea mainnet
  [
    59_144n,
    {
      name: "Linea",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        etherscan: {
          name: "LineaScan",
          url: "https://lineascan.build",
          apiUrl: "https://api.lineascan.build/api",
        },
        blockscout: {
          url: "https://explorer.linea.build",
          apiUrl: "https://api-explorer.linea.build/api",
        },
      },
    },
  ],
  // ink sepolia testnet
  [
    763_373n,
    {
      name: "Ink Sepolia",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        blockscout: {
          url: "https://explorer-sepolia.inkonchain.com",
          apiUrl: "https://explorer-sepolia.inkonchain.com/api",
        },
      },
    },
  ],
  // aurora mainnet
  [
    1_313_161_554n,
    {
      name: "Aurora",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        blockscout: {
          url: "https://explorer.mainnet.aurora.dev",
          apiUrl: "https://explorer.mainnet.aurora.dev/api",
        },
      },
    },
  ],
  // aurora testnet
  [
    1_313_161_555n,
    {
      name: "Aurora Testnet",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        blockscout: {
          url: "https://explorer.testnet.aurora.dev",
          apiUrl: "https://explorer.testnet.aurora.dev/api",
        },
      },
    },
  ],
  // harmony one mainnet
  [
    1_666_600_000n,
    {
      name: "Harmony One",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        blockscout: {
          url: "https://explorer.harmony.one",
          apiUrl: "https://explorer.harmony.one/api",
        },
      },
    },
  ],
  // harmony testnet
  [
    1_666_700_000n,
    {
      name: "Harmony Testnet",
      chainType: GENERIC_CHAIN_TYPE,
      blockExplorers: {
        blockscout: {
          url: "https://explorer.testnet.harmony.one",
          apiUrl: "https://explorer.testnet.harmony.one/api",
        },
      },
    },
  ],
]);
