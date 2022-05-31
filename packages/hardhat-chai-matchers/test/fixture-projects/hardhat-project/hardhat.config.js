require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.4",
  networks: {
    localhost: {
      url: `http://localhost:${process.env.HARDHAT_NODE_PORT}`,
    },
  },
};
