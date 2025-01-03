/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      metadata: {
        // We disable the metadata to keep the fixtures more stables
        appendCBOR: false,
      },
    },
  },
};
