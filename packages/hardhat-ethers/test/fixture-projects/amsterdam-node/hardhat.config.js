require("../../../src/internal/index");

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      hardfork: "amsterdam",
    },
    localhost: {
      // set by the test to the URL of a node it starts from this project
      url: process.env.AMSTERDAM_NODE_URL ?? "http://127.0.0.1:8545",
    },
  },
};
