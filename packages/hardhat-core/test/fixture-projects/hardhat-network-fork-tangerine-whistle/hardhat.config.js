module.exports = {
  networks: {
    hardhat: {
      hardfork: "tangerineWhistle",
      forking: {
        url: process.env.INFURA_URL,
      },
    },
  },
  solidity: "0.5.15",
};
