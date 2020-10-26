const plugins = [
  {
    name: "@nomiclabs/hardhat-ethers",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    version: require("../../packages/hardhat-ethers/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-ethers",
    description: "Injects ethers.js into the Hardhat Runtime Environment",
    tags: ["Ethers.js", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-waffle",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    version: require("../../packages/hardhat-waffle/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-waffle",
    description:
      "Adds a Waffle-compatible provider to the Hardhat Runtime Environment and automatically initializes the Waffle Chai matchers",
    tags: ["Waffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-truffle4",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    version: require("../../packages/hardhat-truffle4/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-truffle4",
    description: "Integration with TruffleContract from Truffle 4",
    tags: ["Truffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-truffle5",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    version: require("../../packages/hardhat-truffle5/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-truffle5",
    description: "Integration with TruffleContract from Truffle 5",
    tags: ["Truffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-web3",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    version: require("../../packages/hardhat-web3/package").version,
    url: "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-web3",
    description: "Injects Web3 1.x into the Hardhat Runtime Environment",
    tags: ["Web3.js", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-web3-legacy",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    version: require("../../packages/hardhat-web3-legacy/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-web3-legacy",
    description: "Injects Web3 0.20.x into the Hardhat Runtime Environment",
    tags: ["Web3.js", "Legacy", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-etherscan",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    version: require("../../packages/hardhat-etherscan/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-etherscan",
    description: "Automatically verify contracts on Etherscan",
    tags: ["Etherscan", "Verification"],
  },
  {
    name: "@nomiclabs/hardhat-ganache",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    version: require("../../packages/hardhat-ganache/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-ganache",
    description: "Hardhat plugin for managing Ganache",
    tags: ["Ganache", "Testing network"],
  },
  {
    name: "@nomiclabs/hardhat-solpp",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    version: require("../../packages/hardhat-solpp/package").version,
    url: "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-solpp",
    description:
      "Automatically run the solpp preprocessor before each compilation",
    tags: ["Solpp", "Preprocessor"],
  },
  {
    name: "@nomiclabs/hardhat-solhint",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    version: require("../../packages/hardhat-solhint/package").version,
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-solhint",
    description: "Easily run solhint to lint your Solidity code",
    tags: ["Solhint", "Linter"],
  },
  {
    name: "@nomiclabs/hardhat-vyper",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    version: require("../../packages/hardhat-vyper/package").version,
    url: "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-vyper",
    description: "Adds support to compile Vyper smart contracts",
    tags: ["Vyper", "Compiler"],
  },
  {
    name: "hardhat-deploy",
    author: "Ronan Sandford",
    authorUrl: "https://github.com/wighawag",
    version: "0.7.0",
    url: "https://github.com/wighawag/hardhat-deploy/tree/master",
    description: "Hardhat plugin for Deployments",
    tags: ["Deployment", "Testing"],
  },
  {
    name: "buidler-gas-reporter",
    author: "Chris Gewecke",
    authorUrl: "https://github.com/cgewecke",
    version: "0.1.2",
    url: "https://github.com/cgewecke/buidler-gas-reporter/tree/master",
    description:
      "Gas usage per unit test. Average gas usage per method. A mocha reporter.",
    tags: ["Testing", "Gas"],
  },
  {
    name: "buidler-typechain",
    author: "Rahul Sethuram",
    authorUrl: "https://twitter.com/rhlsthrm",
    version: "0.0.5",
    url: "https://github.com/rhlsthrm/buidler-typechain/tree/master",
    description: "Generate TypeChain typedefs for smart contracts.",
    tags: ["Testing", "Tasks"],
  },
  {
    name: "solidity-coverage",
    author: "Chris Gewecke",
    authorUrl: "https://github.com/cgewecke",
    version: "0.7.0",
    url:
      "https://github.com/sc-forks/solidity-coverage/tree/master/BUIDLER_README.md",
    readmeUrl:
      "https://raw.githubusercontent.com/sc-forks/solidity-coverage/master/BUIDLER_README.md",
    description: "Code coverage for Solidity",
    tags: ["Testing", "Coverage"],
  },
  {
    name: "@aragon/buidler-aragon",
    author: "Aragon One",
    authorUrl: "https://twitter.com/aragononeteam",
    version: "0.2.3",
    url: "https://github.com/aragon/buidler-aragon/tree/master",
    description: "Buidler plugin for Aragon App development",
    tags: ["Aragon", "Apps"],
  },
  {
    name: "hardhat-spdx-license-identifier",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    version: "2.0.0",
    url:
      "https://github.com/ItsNickBarry/hardhat-spdx-license-identifier/tree/master",
    description:
      "Automatically prepend local Solidity source files with an SPDX License Identifier",
    tags: ["License"],
  },
  {
    name: "buidler-ethers-v5",
    author: "Ronan Sandford",
    authorUrl: "https://github.com/wighawag",
    version: "0.2.1",
    url: "https://github.com/wighawag/buidler-ethers-v5/tree/master",
    description:
      "plugin integrationg ethers v5 into buidler and buidler-deploy ",
    tags: ["Ethers.js", "Testing", "buidler-deploy"],
  },
  {
    name: "buidler-source-descriptor",
    author: "Kendrick Tan",
    authorUrl: "https://github.com/kendricktan",
    version: "",
    url: "https://github.com/kendricktan/buidler-source-descriptor/tree/master",
    description:
      "A Buidler plugin to generate a descriptor of your Solidity source code",
    tags: ["Compiling", "Documentation"],
  },
  {
    name: "hardhat-abi-exporter",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    version: "2.0.2",
    url: "https://github.com/ItsNickBarry/hardhat-abi-exporter/tree/master",
    description: "Automatically export Solidity contract ABIs on compilation",
    tags: ["Compiling", "ABI"],
  },
  {
    name: "hardhat-contract-sizer",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    version: "2.0.0",
    url: "https://github.com/ItsNickBarry/hardhat-contract-sizer/tree/master",
    description: "Calculate compiled contract sizes",
    tags: ["Compiling", "Bytecode"],
  },
  {
    name: "hardhat-log-remover",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    version: "2.0.0",
    url: "https://github.com/ItsNickBarry/hardhat-log-remover/tree/master",
    description:
      "Remove Hardhat console.log imports and calls from Solidity source files",
    tags: ["Logging", "Console", "Deployment"],
  },
  {
    name: "buidler-local-networks-config-plugin",
    author: "Facu Spagnuolo",
    authorUrl: "https://twitter.com/facuspagnuolo",
    version: "1.0.0",
    url:
      "https://github.com/facuspagnuolo/buidler-local-networks-config-plugin/tree/master",
    description:
      "Allow loading network configs for Buidler projects in home file",
    tags: ["Networks", "Config"],
  },
  {
    name: "@eth-optimisim/smock",
    author: "Optimism",
    authorUrl: "https://github.com/ethereum-optimism",
    version: "1.0.0",
    url: "https://github.com/ethereum-optimism/smock/tree/master",
    description:
      "smock is a utility package that can generate mock Solidity contracts written entirely in JavaScript.",
    tags: ["Testing", "Mocking"],
  },
  {
    name: "buidler-ovm-compiler",
    author: "Optimism",
    authorUrl: "https://github.com/ethereum-optimism",
    version: "1.0.0",
    url:
      "https://github.com/ethereum-optimism/optimism-monorepo/tree/master/packages/ovm-toolchain",
    description:
      "Allows users to specify a custom compiler path. This makes it possible to compile your contracts with the custom Optimism Solidity compiler.",
    tags: ["Optimism", "Compiler", "OVM"],
  },
  {
    name: "buidler-ovm-node",
    author: "Optimism",
    authorUrl: "https://github.com/ethereum-optimism",
    version: "1.0.0",
    url:
      "https://github.com/ethereum-optimism/optimism-monorepo/tree/master/packages/ovm-toolchain",
    description:
      "Replaces the VM object with our own custom ethereumjs-vm fork. Add useOvm to your buidler config object to enable OVM execution.",
    tags: ["Optimism", "Buidler EVM", "OVM"],
  },
];

module.exports = plugins.map((p) => ({
  ...p,
  normalizedName: p.name.replace("/", "-").replace(/^@/, ""),
}));
