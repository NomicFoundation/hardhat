module.exports = {
  networks: {
    hardhat: {
      hardfork: "tangerineWhistle",
      forking: {
        url: process.env.ALCHEMY_URL,
      },
    },
  },
  solidity: "0.5.15",
};
