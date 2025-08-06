/** @type import('hardhat/types/config').HardhatUserConfig */
export default {
  solidity: {
    profiles: {
      default: {
        version: "0.8.19",
        settings: {
          metadata: {
            // We disable the metadata to keep the fixtures more stables
            appendCBOR: false,
          },
        },
      },
    },
  },
  networks: {
    default: {
      // We use a different chain id to avoid triggering the auto-wipe for fixtures
      chainId: 1337,
      type: "edr-simulated",
    },
  },
};
