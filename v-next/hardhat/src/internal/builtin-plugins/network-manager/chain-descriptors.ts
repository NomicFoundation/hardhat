import type { ChainDescriptorsConfig } from "../../../types/config.js";

import {
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../constants.js";

/**
 * Block numbers / timestamps were taken from:
 *
 * L1 / Generic:
 * https://github.com/ethereumjs/ethereumjs-monorepo/tree/master/packages/common/src/chains.ts
 * Op:
 * https://github.com/ethereum-optimism/superchain-registry/tree/main/superchain/configs/mainnet
 *
 * To find hardfork activation blocks by timestamp, use:
 * https://api-[TESTNET].[BASE_EXPLORER_URL]/api?module=block&action=getblocknobytime&timestamp=TIMESTAMP&closest=before&apikey=APIKEY
 */
export const DEFAULT_CHAIN_DESCRIPTORS: ChainDescriptorsConfig = new Map([
  // ethereum mainnet
  [
    1,
    {
      name: "Ethereum",
      chainType: L1_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    17_000,
    {
      name: "Holesky",
      chainType: L1_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    560_048,
    {
      name: "Hoodi",
      chainType: L1_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    11_155_111,
    {
      name: "Sepolia",
      chainType: L1_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    10,
    {
      name: "OP Mainnet",
      chainType: OPTIMISM_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    11_155_420,
    {
      name: "OP Sepolia",
      chainType: OPTIMISM_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    42_161,
    {
      name: "Arbitrum One",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    42_170,
    {
      name: "Arbitrum Nova",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    42_170,
    {
      name: "Arbitrum Sepolia",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    8_453,
    {
      name: "Base",
      chainType: OPTIMISM_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    84_532,
    {
      name: "Base Sepolia",
      chainType: OPTIMISM_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    43_114,
    {
      name: "Avalanche",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    43_113,
    {
      name: "Avalanche Fuji",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    137,
    {
      name: "Polygon",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    80_002,
    {
      name: "Polygon Amoy",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    1_101,
    {
      name: "Polygon zkEVM",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    2_442,
    {
      name: "Polygon zkEVM Cardona",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    324,
    {
      name: "ZKsync Era",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    300,
    {
      name: "ZKsync Sepolia Testnet",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
  // bnb smart chain mainnet
  [
    56,
    {
      name: "BNB Smart Chain",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
      blockExplorers: {
        etherscan: {
          name: "BscScan",
          url: "https://bscscan.com",
          apiUrl: "https://api.bscscan.com/api",
        },
      },
    },
  ],
  // bnb smart chain testnet
  [
    97,
    {
      name: "BNB Smart Chain Testnet",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    100,
    {
      name: "Gnosis",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    10_200,
    {
      name: "Gnosis Chiado",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    250,
    {
      name: "Fantom",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    1_284,
    {
      name: "Moonbeam",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    1_287,
    {
      name: "Moonbase Alpha",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    1_285,
    {
      name: "Moonriver",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    57_073,
    {
      name: "Ink",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
      blockExplorers: {
        blockscout: {
          url: "https://explorer.inkonchain.com",
          apiUrl: "https://explorer.inkonchain.com/api",
        },
      },
    },
  ],
  // ink sepolia testnet
  [
    763_373,
    {
      name: "Ink Sepolia",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    1_313_161_554,
    {
      name: "Aurora",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    1_313_161_555,
    {
      name: "Aurora Testnet",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    1_666_600_000,
    {
      name: "Harmony One",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
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
    1_666_700_000,
    {
      name: "Harmony Testnet",
      chainType: GENERIC_CHAIN_TYPE,
      hardforkHistory: new Map(),
      blockExplorers: {
        blockscout: {
          url: "https://explorer.testnet.harmony.one",
          apiUrl: "https://explorer.testnet.harmony.one/api",
        },
      },
    },
  ],
]);
