// This list of plugins is automatically sorted by the numbers of downloads
// that the plugin got on npm in the last 30 days. Please add yourself to the
// bottom of the list.
//
// If your plugin's `name` is not it's package name, you can add an optional
// `npmPackage` field.
module.exports.communityPlugins = [
  {
    name: "hardhat-deploy",
    author: "Ronan Sandford",
    authorUrl: "https://github.com/wighawag",
    description: "Hardhat plugin for Deployments",
    tags: ["Deployment", "Testing"],
  },
  {
    name: "hardhat-preprocessor",
    author: "Ronan Sandford",
    authorUrl: "https://github.com/wighawag",
    description:
      "An hardhat plugin to pre-process contract source code before compilation",
    tags: ["Solidity", "Preprocessor"],
  },
  {
    name: "hardhat-deploy-ethers",
    author: "Ronan Sandford",
    authorUrl: "https://github.com/wighawag",
    description: "A hardhat-deploy plugin for Ethers.js v5",
    tags: ["Ethers.js", "hardhat-deploy"],
  },
  {
    name: "@openzeppelin/hardhat-upgrades",
    author: "OpenZeppelin",
    authorUrl: "https://openzeppelin.com",
    description:
      "Hardhat plugin for deploying and managing upgradeable contracts.",
    tags: ["Security", "Upgrades", "OpenZeppelin"],
  },
  {
    name: "@tenderly/hardhat-tenderly",
    author: "Tenderly",
    authorUrl: "https://tenderly.co/",
    description:
      "Easily integrate your Hardhat project with Tenderly. Tenderly is an Ethereum monitoring, debugging and analytics platform.",
    tags: ["Debuggin", "Monitoring", "Alerting", "Tasks", "Scripts"],
  },
  {
    name: "hardhat-ethernal",
    author: "Ethernal",
    authorUrl: "https://www.tryethernal.com",
    description:
      "Integrate your Hardhat project and Hardhat network with Ethernal. Ethernal is a block explorer for private chains.",
    tags: ["explorer", "debugging", "development-tool"],
  },
  {
    name: "@typechain/hardhat",
    author: "Rahul Sethuram",
    authorUrl: "https://twitter.com/rhlsthrm",
    description: "Zero-config TypeChain support for Hardhat.",
    tags: ["Testing", "Tasks"],
  },
  {
    name: "hardhat-spdx-license-identifier",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    description:
      "Automatically prepend local Solidity source files with an SPDX License Identifier",
    tags: ["License"],
  },
  {
    name: "hardhat-abi-exporter",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    description: "Automatically export Solidity contract ABIs on compilation",
    tags: ["Compiling", "ABI"],
  },
  {
    name: "hardhat-contract-sizer",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    description: "Calculate compiled contract sizes",
    tags: ["Compiling", "Bytecode"],
  },
  {
    name: "hardhat-log-remover",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    description:
      "Remove Hardhat console.log imports and calls from Solidity source files",
    tags: ["Logging", "Console", "Deployment"],
  },
  {
    name: "hardhat-dependency-compiler",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    description: "Compile Solidity sources directly from NPM dependencies",
    tags: ["Compiling", "Dependencies"],
  },
  {
    name: "hardhat-docgen",
    author: "Nick Barry, samuveth",
    authorUrl: "https://github.com/ItsNickBarry",
    description: "Generate a static documentation site from NatSpec comments",
    tags: ["Documentation", "NatSpec"],
  },
  {
    name: "hardhat-watcher",
    author: "Xander Deseyn",
    authorUrl: "https://github.com/N1ghtly",
    description: "Automatically run Hardhat actions on file changes.",
    tags: ["Tasks", "Testing"],
  },
  {
    name: "solidity-coverage",
    author: "Chris Gewecke",
    authorUrl: "https://github.com/cgewecke",
    description: "Code coverage for Solidity",
    tags: ["Testing", "Coverage", "Hardhat plugin"],
  },
  {
    name: "hardhat-gas-reporter",
    author: "Chris Gewecke",
    authorUrl: "https://github.com/cgewecke",
    description:
      "Gas usage per unit test. Average gas usage per method. A mocha reporter.",
    tags: ["Testing", "Gas", "Hardhat plugin"],
  },
  {
    name: "hardhat-erc1820",
    author: "David Mihal",
    authorUrl: "https://twitter.com/dmihal",
    description:
      "Automatically deploy the ERC-1820 registry contract to Hardhat EVM chains.",
    tags: ["Testing"],
  },
  {
    name: "@aragon/buidler-aragon",
    author: "Aragon One",
    authorUrl: "https://twitter.com/aragononeteam",
    description: "Buidler plugin for Aragon App development",
    tags: ["Aragon", "Apps", "Buidler plugin"],
  },
  {
    name: "buidler-source-descriptor",
    author: "Kendrick Tan",
    authorUrl: "https://github.com/kendricktan",
    description:
      "A Buidler plugin to generate a descriptor of your Solidity source code",
    tags: ["Compiling", "Documentation", "Buidler plugin"],
  },
  {
    name: "hardhat-local-networks-config-plugin",
    author: "Facu Spagnuolo",
    authorUrl: "https://twitter.com/facuspagnuolo",
    description:
      "Allow loading network configs for Hardhat projects in home file",
    tags: ["Networks", "Config"],
  },
  {
    name: "@eth-optimism/plugins/hardhat/compiler",
    npmPackage: "@eth-optimism/plugins",
    author: "Optimism",
    authorUrl: "https://github.com/ethereum-optimism",
    description:
      "Automatically compiles your Solidity contracts with the OVM compiler.",
    tags: ["Optimism", "Solidity", "Compiler", "OVM"],
  },
  {
    name: "@eth-optimism/plugins/hardhat/ethers",
    npmPackage: "@eth-optimism/plugins",
    author: "Optimism",
    authorUrl: "https://github.com/ethereum-optimism",
    description: "Integrates Hardhat and ethers.js with Optimism's L2 network.",
    tags: ["Optimism", "ethers.js", "OVM"],
  },
  {
    name: "hardhat-react",
    npmPackage: "@symfoni/hardhat-react",
    author: "Symfoni",
    authorUrl: "https://github.com/symfoni/",
    description:
      "A Hardhat plugin that generates a React hook component from your smart contracts. Hot reloaded into your React app. Deployed or not deployed. And everything typed and initialized.",
    tags: ["Ethers", "React", "Deploy", "Typechain", "Frontend", "Web3modal"],
  },
  {
    name: "hardhat-etherscan-abi",
    author: "Roman Semenov",
    authorUrl: "https://github.com/poma",
    description: "Automatically fetch contract ABI from Etherscan",
    tags: ["Etherscan", "ABI"],
  },
  {
    name: "hardhat-tracer",
    author: "Soham Zemse",
    authorUrl: "https://github.com/zemse/",
    description: "See emitted events during your hardhat tests in the console",
    tags: ["Events", "Logs", "Trace", "Console", "Testing"],
  },
  {
    name: "hardhat-circom",
    author: "Project Sophon",
    authorUrl: "https://github.com/projectsophon",
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
    description: "Exporting solidity contract storage layout",
    tags: ["solidity", "storage-layout"],
  },
  {
    name: "hardhat-change-network",
    author: "David Mihal",
    authorUrl: "https://github.com/dmihal",
    description: "Allows changing the current network in Hardhat.",
    tags: ["Testing"],
  },
  {
    name: "hardhat-packager",
    author: "Paul Razvan Berg",
    authorUrl: "https://github.com/paulrberg",
    description:
      "Prepare the contract artifacts and the TypeChain bindings for registry deployment.",
    tags: ["Deployment", "Tasks", "TypeChain"],
  },
  {
    name: "hardhat-time-n-mine",
    author: "Gonzalo Petraglia & Alan Verbner",
    authorUrl: "https://github.com/atixlabs",
    description:
      "Helper plugin to manipulate blocks timestamp and trigger mining. It can be used from the command line and in the tests.",
    tags: ["Testing"],
  },
  {
    name: "hardhat-proxy",
    author: "Jinyang Liu",
    authorUrl: "https://github.com/jinyang1994",
    description:
      "This plugin brings the proxy contract to Hardhat, which allows you to manage the proxy contract in a simple way.",
    tags: ["Proxy Contract", "Tasks", "Scripts"],
  },
  {
    name: "hardhat-fund-link",
    author: "Applied Blockchain",
    npmPackage: "@appliedblockchain/chainlink-plugins-fund-link",
    authorUrl: "https://github.com/appliedblockchain",
    description: "Transfers Link token amount between accounts.",
    tags: ["Chainlink", "Link"],
  },
  {
    name: "@defi-wonderland/smock",
    author: "DeFi Wonderland and Optimism PBC",
    authorUrl: "https://github.com/defi-wonderland",
    description:
      "The Solidity mocking library. Smock is a utility package that can generate mock Solidity contracts written entirely in JavaScript.",
    tags: ["Testing", "Mocking"],
  },
  {
    name: "hardhat-secure-signer",
    author: "Anthony Daniel Martin",
    authorUrl: "https://github.com/anthonymartin",
    description:
      "Enhanced hardhat credential security using an interactive prompt and password-encrypted credentials",
    tags: [
      "private key",
      "encryption",
      "security",
      "developer experience",
      "convenience",
      "ethers.js",
    ],
  },
  {
    name: "xdeployer",
    author: "Pascal Marco Caversaccio",
    authorUrl: "https://github.com/pcaversaccio",
    description:
      "Hardhat plugin to deploy your smart contracts across multiple EVM chains with the same deterministic address.",
    tags: ["Deployment", "CREATE2", "Tasks"],
  },
  {
    name: "@controlcpluscontrolv/hardhat-yul",
    author: "ControlCplusControlV",
    authorUrl: "https://github.com/controlCplusControlV/",
    description:
      "Hardhat plugin to compile the Yul and Yul+ languages into solc compatible artifacts. Works with .yul and .yulp file extensions",
    tags: ["Yul", "Assembly", "Compiler", "Yul+"],
  },
  {
    name: "@primitivefi/hardhat-dodoc",
    author: "Primitive",
    authorUrl: "https://github.com/primitivefinance/primitive-dodoc",
    description:
      "Zero-config Hardhat plugin to generate documentation for all your Solidity contracts.",
    tags: ["Documentation", "Docs", "Solidity", "NatSpec"],
  },
];

module.exports.officialPlugins = [
  {
    name: "@nomiclabs/hardhat-ethers",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    description: "Injects ethers.js into the Hardhat Runtime Environment",
    tags: ["Ethers.js", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-waffle",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    description:
      "Adds a Waffle-compatible provider to the Hardhat Runtime Environment and automatically initializes the Waffle Chai matchers",
    tags: ["Waffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-truffle4",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    description: "Integration with TruffleContract from Truffle 4",
    tags: ["Truffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-truffle5",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    description: "Integration with TruffleContract from Truffle 5",
    tags: ["Truffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-web3",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    description: "Injects Web3 1.x into the Hardhat Runtime Environment",
    tags: ["Web3.js", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-web3-legacy",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    description: "Injects Web3 0.20.x into the Hardhat Runtime Environment",
    tags: ["Web3.js", "Legacy", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-etherscan",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    description: "Automatically verify contracts on Etherscan",
    tags: ["Etherscan", "Verification"],
  },
  {
    name: "@nomiclabs/hardhat-ganache",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    description: "Hardhat plugin for managing Ganache",
    tags: ["Ganache", "Testing network"],
  },
  {
    name: "@nomiclabs/hardhat-solpp",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    description:
      "Automatically run the solpp preprocessor before each compilation",
    tags: ["Solpp", "Preprocessor"],
  },
  {
    name: "@nomiclabs/hardhat-solhint",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    description: "Easily run solhint to lint your Solidity code",
    tags: ["Solhint", "Linter"],
  },
  {
    name: "@nomiclabs/hardhat-vyper",
    author: "Nomic Labs",
    authorUrl: "https://twitter.com/nomiclabs",
    description: "Adds support to compile Vyper smart contracts",
    tags: ["Vyper", "Compiler"],
  },
].map((p) => ({
  ...p,
  normalizedName: p.name.split("/").join("-").replace(/^@/, ""),
}));
