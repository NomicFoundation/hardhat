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
    hardhat: {
      type: "edr",
      throwOnTransactionFailures: false,
    },
  },
};
