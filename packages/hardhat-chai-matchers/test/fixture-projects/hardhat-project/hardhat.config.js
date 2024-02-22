require("@nomicfoundation/hardhat-ethers");

module.exports = {
  solidity: "0.8.4",
  networks: {
    hardhat: {
      chainId: Number(process.env.CHAIN_ID ?? "31337"),
    },
    localhost: {
      url: `http://127.0.0.1:${process.env.HARDHAT_NODE_PORT}`,
    },
  },
};
