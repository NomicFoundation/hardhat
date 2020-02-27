module.exports = [
  {
    name: "@nomiclabs/buidler-truffle4",
    version: require("../../packages/buidler-truffle4/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle4",
    description: "Integration with TruffleContract from Truffle 4",
    tags: ["Truffle", "Testing"]
  },
  {
    name: "@nomiclabs/buidler-truffle5",
    version: require("../../packages/buidler-truffle5/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-truffle5",
    description: "Integration with TruffleContract from Truffle 5",
    tags: ["Truffle", "Testing"]
  },
  {
    name: "@nomiclabs/buidler-web3",
    version: require("../../packages/buidler-web3/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3",
    description: "Injects Web3 1.x into the Buidler Runtime Environment",
    tags: ["Web3.js", "Testing", "Tasks", "Scripts"]
  },
  {
    name: "@nomiclabs/buidler-web3-legacy",
    version: require("../../packages/buidler-web3-legacy/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-web3-legacy",
    description: "Injects Web3 0.20.x into the Buidler Runtime Environment",
    tags: ["Web3.js", "Legacy", "Testing", "Tasks", "Scripts"]
  },
  {
    name: "@nomiclabs/buidler-ethers",
    version: require("../../packages/buidler-ethers/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-ethers",
    description: "Injects ethers.js into the Buidler Runtime Environment",
    tags: ["Ethers.js", "Testing", "Tasks", "Scripts"]
  },
  {
    name: "@nomiclabs/buidler-etherscan",
    version: require("../../packages/buidler-etherscan/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-etherscan",
    description: "Automatically verify contracts on Etherscan",
    tags: ["Etherscan", "Verification"]
  },
  {
    name: "@nomiclabs/buidler-ganache",
    version: require("../../packages/buidler-ganache/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-ganache",
    description: "Buidler plugin for managing Ganache",
    tags: ["Ganache", "Testing network"]
  },
  {
    name: "@nomiclabs/buidler-solpp",
    version: require("../../packages/buidler-solpp/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-solpp",
    description:
      "Automatically run the solpp preprocessor before each compilation",
    tags: ["Solpp", "Preprocessor"]
  },
  {
    name: "@nomiclabs/buidler-solhint",
    version: require("../../packages/buidler-solhint/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-solhint",
    description: "Easily run solhint to lint your Solidity code",
    tags: ["Solhint", "Linter"]
  },
  {
    name: "@nomiclabs/buidler-vyper",
    version: require("../../packages/buidler-vyper/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/master/packages/buidler-vyper",
    description: "Adds support to compile Vyper smart contracts",
    tags: ["Vyper", "Compiler"]
  },
  {
    name: "buidler-gas-reporter",
    version: "0.1.2",
    url: "https://github.com/cgewecke/buidler-gas-reporter/tree/master",
    description:
      "Gas usage per unit test. Average gas usage per method. A mocha reporter.",
    tags: ["Testing", "Gas"]
  },
  {
    name: "buidler-typechain",
    version: "0.0.5",
    url: "https://github.com/rhlsthrm/buidler-typechain/tree/master",
    description:
      "Generate TypeChain typedefs for smart contracts.",
    tags: ["Testing", "Tasks"]
  },
  {
    name: "solidity-coverage",
    version: "0.7.0",
    url: "https://github.com/sc-forks/solidity-coverage/tree/master/BUIDLER_README.md",
    readmeUrl: "https://raw.githubusercontent.com/sc-forks/solidity-coverage/master/BUIDLER_README.md",
    description: "Code coverage for Solidity",
    tags: ["Testing", "Coverage"]
  }
];
