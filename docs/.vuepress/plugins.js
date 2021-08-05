// This list of plugins is automatically sorted by the numbers of downloads
// that the plugin got on npm in the last 30 days. Please add yourself to the
// bottom of the list.
//
// If your plugin's `name` is not it's package name, you can add an optional
// `npmPackage` field.
//
// Note that the `url` is an URL to the **branch** the website should get your
// plugin's the README.md from, not the repository.

const plugins = [
  {
    name: "@nomiclabs/hardhat-ethers",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-ethers",
    description: "Injects ethers.js into the Hardhat Runtime Environment",
    tags: ["Ethers.js", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-waffle",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-waffle",
    description:
      "Adds a Waffle-compatible provider to the Hardhat Runtime Environment and automatically initializes the Waffle Chai matchers",
    tags: ["Waffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-truffle4",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-truffle4",
    description: "Integration with TruffleContract from Truffle 4",
    tags: ["Truffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-truffle5",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-truffle5",
    description: "Integration with TruffleContract from Truffle 5",
    tags: ["Truffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-web3",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-web3",
    description: "Injects Web3 1.x into the Hardhat Runtime Environment",
    tags: ["Web3.js", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-web3-legacy",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-web3-legacy",
    description: "Injects Web3 0.20.x into the Hardhat Runtime Environment",
    tags: ["Web3.js", "Legacy", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-etherscan",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-etherscan",
    description: "Automatically verify contracts on Etherscan",
    tags: ["Etherscan", "Verification"],
  },
  {
    name: "@nomiclabs/hardhat-ganache",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-ganache",
    description: "Hardhat plugin for managing Ganache",
    tags: ["Ganache", "Testing network"],
  },
  {
    name: "@nomiclabs/hardhat-solpp",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-solpp",
    description:
      "Automatically run the solpp preprocessor before each compilation",
    tags: ["Solpp", "Preprocessor"],
  },
  {
    name: "@nomiclabs/hardhat-solhint",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-solhint",
    description: "Easily run solhint to lint your Solidity code",
    tags: ["Solhint", "Linter"],
  },
  {
    name: "@nomiclabs/hardhat-vyper",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    url:
      "https://github.com/nomiclabs/hardhat/tree/master/packages/hardhat-vyper",
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
    url: "https://github.com/wighawag/hardhat-deploy-ethers/tree/main",
    description: "A hardhat-deploy plugin for Ethers.js v5",
    tags: ["Ethers.js", "hardhat-deploy"],
  },
  {
    name: "@openzeppelin/hardhat-upgrades",
    author: "OpenZeppelin",
    authorUrl: "https://openzeppelin.com",
    url:
      "https://github.com/OpenZeppelin/openzeppelin-upgrades/tree/master/packages/plugin-hardhat",
    description:
      "Hardhat plugin for deploying and managing upgradeable contracts.",
    tags: ["Security", "Upgrades", "OpenZeppelin"],
  },
  {
    name: "@tenderly/hardhat-tenderly",
    author: "Tenderly",
    authorUrl: "https://tenderly.co/",
    url: "https://github.com/Tenderly/hardhat-tenderly/tree/master",
    description:
      "Easily integrate your Hardhat project with Tenderly. Tenderly is an Ethereum monitoring, debugging and analytics platform.",
    tags: ["Debuggin", "Monitoring", "Alerting", "Tasks", "Scripts"],
  },
  {
    name: "hardhat-ethernal",
    author: "Ethernal",
    authorUrl: "https://www.tryethernal.com",
    url: "https://github.com/tryethernal/hardhat-ethernal/tree/master",
    description:
      "Integrate your Hardhat project and Hardhat network with Ethernal. Ethernal is a block explorer for private chains.",
    tags: ["explorer", "debugging", "development-tool"],
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
    name: "hardhat-dependency-compiler",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    url:
      "https://github.com/ItsNickBarry/hardhat-dependency-compiler/tree/master",
    description: "Compile Solidity sources directly from NPM dependencies",
    tags: ["Compiling", "Dependencies"],
  },
  {
    name: "hardhat-docgen",
    author: "Nick Barry, samuveth",
    authorUrl: "https://github.com/ItsNickBarry",
    url: "https://github.com/ItsNickBarry/hardhat-docgen/tree/master",
    description: "Generate a static documentation site from NatSpec comments",
    tags: ["Documentation", "NatSpec"],
  },
  {
    name: "hardhat-watcher",
    author: "Xander Deseyn",
    authorUrl: "https://github.com/N1ghtly",
    url: "https://github.com/N1ghtly/hardhat-watcher/tree/main",
    description: "Automatically run Hardhat actions on file changes.",
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
    name: "hardhat-erc1820",
    author: "David Mihal",
    authorUrl: "https://twitter.com/dmihal",
    url: "https://github.com/dmihal/hardhat-erc1820/tree/master",
    description:
      "Automatically deploy the ERC-1820 registry contract to Hardhat EVM chains.",
    tags: ["Testing"],
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
    name: "hardhat-local-networks-config-plugin",
    author: "Facu Spagnuolo",
    authorUrl: "https://twitter.com/facuspagnuolo",
    url:
      "https://github.com/facuspagnuolo/hardhat-local-networks-config-plugin/tree/master",
    description:
      "Allow loading network configs for Hardhat projects in home file",
    tags: ["Networks", "Config"],
  },
  {
    name: "@eth-optimism/smock",
    author: "Optimism",
    authorUrl: "https://github.com/ethereum-optimism",
    url: "https://github.com/ethereum-optimism/smock/tree/master",
    description:
      "smock is a utility package that can generate mock Solidity contracts written entirely in JavaScript.",
    tags: ["Testing", "Mocking", "Buidler plugin"],
  },
  {
    name: "@eth-optimism/plugins/hardhat/compiler",
    npmPackage: "@eth-optimism/plugins",
    author: "Optimism",
    authorUrl: "https://github.com/ethereum-optimism",
    url:
      "https://github.com/ethereum-optimism/plugins/tree/master/src/hardhat/compiler",
    description:
      "Automatically compiles your Solidity contracts with the OVM compiler.",
    tags: ["Optimism", "Solidity", "Compiler", "OVM"],
  },
  {
    name: "@eth-optimism/plugins/hardhat/ethers",
    npmPackage: "@eth-optimism/plugins",
    author: "Optimism",
    authorUrl: "https://github.com/ethereum-optimism",
    url: "https://github.com/ethereum-optimism/plugins/tree/master",
    description: "Integrates Hardhat and ethers.js with Optimism's L2 network.",
    tags: ["Optimism", "ethers.js", "OVM"],
  },
  {
    name: "hardhat-react",
    npmPackage: "@symfoni/hardhat-react",
    author: "Symfoni",
    authorUrl: "https://github.com/symfoni/",
    url:
      "https://github.com/symfoni/symfoni-monorepo/tree/master/packages/hardhat-react",
    description:
      "A Hardhat plugin that generates a React hook component from your smart contracts. Hot reloaded into your React app. Deployed or not deployed. And everything typed and initialized.",
    tags: ["Ethers", "React", "Deploy", "Typechain", "Frontend", "Web3modal"],
  },
  {
    name: "hardhat-etherscan-abi",
    author: "Roman Semenov",
    authorUrl: "https://github.com/poma",
    url: "https://github.com/poma/hardhat-etherscan-abi/tree/master",
    description: "Automatically fetch contract ABI from Etherscan",
    tags: ["Etherscan", "ABI"],
  },
  {
    name: "hardhat-tracer",
    author: "Soham Zemse",
    authorUrl: "https://github.com/zemse/",
    url: "https://github.com/zemse/hardhat-tracer/tree/master",
    description: "See emitted events during your hardhat tests in the console",
    tags: ["Events", "Logs", "Trace", "Console", "Testing"],
  },
  {
    name: "hardhat-circom",
    author: "Project Sophon",
    authorUrl: "https://github.com/projectsophon",
    url: "https://github.com/projectsophon/hardhat-circom/tree/master",
    description: "Provide tasks to integrate Circom and SnarkJS",
    tags: [
      "Circom",
      "Snarkjs",
      "Preprocessor",
      "Compiling",
      "Tasks",
      "Scripts",
    ],
  },
  {
    name: "hardhat-storage-layout",
    author: "Aurora Labs",
    authorUrl: "https://github.com/aurora-is-near",
    url: "https://github.com/aurora-is-near/hardhat-storage-layout/tree/main",
    description: "Exporting solidity contract storage layout",
    tags: ["solidity", "storage-layout"],
  },
  {
    name: "hardhat-change-network",
    author: "David Mihal",
    authorUrl: "https://github.com/dmihal",
    url: "https://github.com/dmihal/hardhat-change-network/tree/master",
    description: "Allows changing the current network in Hardhat.",
    tags: ["Testing"],
  },
];

module.exports = plugins.map((p) => ({
  ...p,
  normalizedName: p.name.split("/").join("-").replace(/^@/, ""),
}));
