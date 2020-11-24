const plugins = [
  {
    name: "@nomiclabs/hardhat-ethers",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-ethers",
    description: "Injects ethers.js into the Hardhat Runtime Environment",
    tags: ["Ethers.js", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-waffle",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
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
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-truffle4",
    description: "Integration with TruffleContract from Truffle 4",
    tags: ["Truffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-truffle5",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-truffle5",
    description: "Integration with TruffleContract from Truffle 5",
    tags: ["Truffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-web3",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url: "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-web3",
    description: "Injects Web3 1.x into the Hardhat Runtime Environment",
    tags: ["Web3.js", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-web3-legacy",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-web3-legacy",
    description: "Injects Web3 0.20.x into the Hardhat Runtime Environment",
    tags: ["Web3.js", "Legacy", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-etherscan",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-etherscan",
    description: "Automatically verify contracts on Etherscan",
    tags: ["Etherscan", "Verification"],
  },
  {
    name: "@nomiclabs/hardhat-ganache",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-ganache",
    description: "Hardhat plugin for managing Ganache",
    tags: ["Ganache", "Testing network"],
  },
  {
    name: "@nomiclabs/hardhat-solpp",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url: "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-solpp",
    description:
      "Automatically run the solpp preprocessor before each compilation",
    tags: ["Solpp", "Preprocessor"],
  },
  {
    name: "@nomiclabs/hardhat-solhint",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-solhint",
    description: "Easily run solhint to lint your Solidity code",
    tags: ["Solhint", "Linter"],
  },
  {
    name: "@nomiclabs/hardhat-vyper",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url: "https://github.com/nomiclabs/buidler/tree/2.0/packages/hardhat-vyper",
    description: "Adds support to compile Vyper smart contracts",
    tags: ["Vyper", "Compiler"],
  },
  {
    name: "hardhat-deploy",
    author: "Ronan Sandford",
    authorUrl: "https://github.com/wighawag",
    url: "https://github.com/wighawag/hardhat-deploy/tree/master",
    description: "Hardhat plugin for Deployments",
    tags: ["Deployment", "Testing"],
  },
  {
    name: "hardhat-preprocessor",
    author: "Ronan Sandford",
    authorUrl: "https://github.com/wighawag",
    url: "https://github.com/wighawag/hardhat-preprocessor/tree/master",
    description:
      "An hardhat plugin to pre-process contract source code before compilation",
    tags: ["Solidity", "Preprocessor"],
  },
  {
    name: "hardhat-deploy-ethers",
    author: "Ronan Sandford",
    authorUrl: "https://github.com/wighawag",
    url: "https://github.com/wighawag/hardhat-deploy-ethers/tree/master",
    description: "A hardhat-deploy plugin for Ethers.js v5",
    tags: ["Ethers.js", "hardhat-deploy"],
  },
  {
    name: "hardhat-upgrades",
    author: "OpenZeppelin",
    authorUrl: "https://openzeppelin.com",
    url: "https://github.com/OpenZeppelin/openzeppelin-upgrades/tree/master/packages/plugin-hardhat",
    description: "Hardhat plugin for deploying and managing upgradeable contracts.",
    tags: ["Security", "Upgrades", "OpenZeppelin"],
  },  
  {
    name: "hardhat-typechain",
    author: "Rahul Sethuram",
    authorUrl: "https://twitter.com/rhlsthrm",
    url: "https://github.com/rhlsthrm/hardhat-typechain/tree/master",
    description: "Generate TypeChain type definitions for smart contracts.",
    tags: ["Testing", "Tasks"],
  },
  {
    name: "hardhat-spdx-license-identifier",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    url:
      "https://github.com/ItsNickBarry/hardhat-spdx-license-identifier/tree/master",
    description:
      "Automatically prepend local Solidity source files with an SPDX License Identifier",
    tags: ["License"],
  },
  {
    name: "hardhat-abi-exporter",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    url: "https://github.com/ItsNickBarry/hardhat-abi-exporter/tree/master",
    description: "Automatically export Solidity contract ABIs on compilation",
    tags: ["Compiling", "ABI"],
  },
  {
    name: "hardhat-contract-sizer",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    url: "https://github.com/ItsNickBarry/hardhat-contract-sizer/tree/master",
    description: "Calculate compiled contract sizes",
    tags: ["Compiling", "Bytecode"],
  },
  {
    name: "hardhat-log-remover",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    url: "https://github.com/ItsNickBarry/hardhat-log-remover/tree/master",
    description:
      "Remove Hardhat console.log imports and calls from Solidity source files",
    tags: ["Logging", "Console", "Deployment"],
  },
  {
    name: "hardhat-watcher",
    author: "Xander Deseyn",
    authorUrl: "https://github.com/N1ghtly",
    url: "https://github.com/N1ghtly/hardhat-watcher/tree/main",
    description:
      "Automatically run Hardhat actions on file changes.",
    tags: ["Tasks", "Testing"],
  },
  {
    name: "solidity-coverage",
    author: "Chris Gewecke",
    authorUrl: "https://github.com/cgewecke",
    url:
      "https://github.com/sc-forks/solidity-coverage/tree/master/HARDHAT_README.md",
    readmeUrl:
      "https://raw.githubusercontent.com/sc-forks/solidity-coverage/master/HARDHAT_README.md",
    description: "Code coverage for Solidity",
    tags: ["Testing", "Coverage", "Hardhat plugin"],
  },
  {
    name: "hardhat-gas-reporter",
    author: "Chris Gewecke",
    authorUrl: "https://github.com/cgewecke",
    url: "https://github.com/cgewecke/hardhat-gas-reporter/tree/master",
    description:
      "Gas usage per unit test. Average gas usage per method. A mocha reporter.",
    tags: ["Testing", "Gas", "Hardhat plugin"],
  },
  {
    name: "@aragon/buidler-aragon",
    author: "Aragon One",
    authorUrl: "https://twitter.com/aragononeteam",
    url: "https://github.com/aragon/buidler-aragon/tree/master",
    description: "Buidler plugin for Aragon App development",
    tags: ["Aragon", "Apps", "Buidler plugin"],
  },
  {
    name: "buidler-source-descriptor",
    author: "Kendrick Tan",
    authorUrl: "https://github.com/kendricktan",
    url: "https://github.com/kendricktan/buidler-source-descriptor/tree/master",
    description:
      "A Buidler plugin to generate a descriptor of your Solidity source code",
    tags: ["Compiling", "Documentation", "Buidler plugin"],
  },
  {
    name: "buidler-local-networks-config-plugin",
    author: "Facu Spagnuolo",
    authorUrl: "https://twitter.com/facuspagnuolo",
    url:
      "https://github.com/facuspagnuolo/buidler-local-networks-config-plugin/tree/master",
    description:
      "Allow loading network configs for Buidler projects in home file",
    tags: ["Networks", "Config", "Buidler plugin"],
  },
  {
    name: "@eth-optimisim/smock",
    author: "Optimism",
    authorUrl: "https://github.com/ethereum-optimism",
    url: "https://github.com/ethereum-optimism/smock/tree/master",
    description:
      "smock is a utility package that can generate mock Solidity contracts written entirely in JavaScript.",
    tags: ["Testing", "Mocking", "Buidler plugin"],
  },
  {
    name: "buidler-ovm-compiler",
    author: "Optimism",
    authorUrl: "https://github.com/ethereum-optimism",
    url:
      "https://github.com/ethereum-optimism/optimism-monorepo/tree/master/packages/ovm-toolchain",
    description:
      "Allows users to specify a custom compiler path. This makes it possible to compile your contracts with the custom Optimism Solidity compiler.",
    tags: ["Optimism", "Compiler", "OVM", "Buidler plugin"],
  },
  {
    name: "buidler-ovm-node",
    author: "Optimism",
    authorUrl: "https://github.com/ethereum-optimism",
    url:
      "https://github.com/ethereum-optimism/optimism-monorepo/tree/master/packages/ovm-toolchain",
    description:
      "Replaces the VM object with our own custom ethereumjs-vm fork. Add useOvm to your buidler config object to enable OVM execution.",
    tags: ["Optimism", "Buidler EVM", "OVM", "Buidler plugin"],
  },
  {
    name: "hardhat-react",
    author: "Symfoni",
    authorUrl: "https://github.com/symfoni/",
    url:
      "https://github.com/symfoni/hardhat-plugins/tree/hardhat/packages/hardhat-react",
    description:
      "A Hardhat plugin that generates a React hook component from your smart contracts. Hot reloaded into your React app. Deployed or not deployed. And everything typed and initialized.",
    tags: ["Ethers", "React", "Deploy", "Typechain", "Frontend", "Web3modal"],
  },
];

module.exports = plugins.map((p) => ({
  ...p,
  normalizedName: p.name.replace("/", "-").replace(/^@/, ""),
}));
