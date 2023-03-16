require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.4",
  networks: {
    localhost: {
      url: `http://127.0.0.1:${process.env.HARDHAT_NODE_PORT}`,
    },
  },
};
