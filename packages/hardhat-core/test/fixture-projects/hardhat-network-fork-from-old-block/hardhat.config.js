module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_URL,
        blockNumber: 2463000,
      },
    },
  },
  solidity: "0.5.15",
};
