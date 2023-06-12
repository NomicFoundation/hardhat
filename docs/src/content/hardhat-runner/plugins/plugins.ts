// This list of plugins is automatically sorted by the numbers of downloads
// that the plugin got on npm in the last 30 days. Please add yourself to the
// bottom of the list.
//
// If your plugin's `name` is not it's package name, you can add an optional
// `npmPackage` field.
import { IPlugin } from "../../../model/types";

const communityPlugins: IPlugin[] = [
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
    name: "hardhat-forta",
    author: "Forta",
    authorUrl: "https://forta.org/",
    description:
      "Quickly add security and operational alerting for your project using Forta: a decentralized monitoring network for Web3 systems.",
    tags: ["Security", "Monitoring", "Alerting", "Forta"],
  },
  {
    name: "@kriptonio/hardhat-kriptonio",
    author: "Kriptonio",
    authorUrl: "https://kriptonio.com/",
    description:
      "This plugin allows you to upload compiled hardhat smart contract artifacts to Kriptonio. On kriptonio side new smart contract will be created with attached artifacts, which you can afterward deploy and manage via kriptonio.",
    tags: ["Monitoring", "Debugging", "Deployment"],
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
    description: "Compile Solidity sources directly from npm dependencies",
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
    name: "@solidstate/hardhat-4byte-uploader",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    description:
      "Upload local function selectors to the Ethereum Selector Database",
    tags: ["Bytecode", "ABI"],
  },
  {
    name: "@solidstate/hardhat-test-short-circuit",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    description:
      "Stop Hardhat test execution on demand and print output from completed tests",
    tags: ["Testing", "Mocha"],
  },
  {
    name: "@solidstate/hardhat-txn-dot-xyz",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    description: "Generate and execute on-chain transactions via txn.xyz",
    tags: ["Signing", "Scripts"],
  },
  {
    name: "@solidstate/hardhat-bytecode-exporter",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    description: "Automatically export contract bytecode on compilation",
    tags: ["Bytecode", "Compiling"],
  },
  {
    name: "@solidstate/hardhat-accounts",
    author: "Nick Barry",
    authorUrl: "https://github.com/ItsNickBarry",
    description: "Output list of available accounts and their balances",
    tags: ["Accounts", "Balances"],
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
    name: "hardhat-gas-trackooor",
    author: "d3or",
    authorUrl: "https://github.com/d3or",
    description: "Simple plugin to track gas on the transaction level.",
    tags: ["Testing", "Gas", "Hardhat plugin"],
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
    description:
      "See internal transactions, events and storage operations during your hardhat tests in the console",
    tags: ["EVM", "Events", "Logs", "Trace", "Console", "Testing"],
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
    npmPackage: "@atixlabs/hardhat-time-n-mine",
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
    name: "xdeployer",
    author: "Pascal Marco Caversaccio",
    authorUrl: "https://github.com/pcaversaccio",
    description:
      "Hardhat plugin to deploy your smart contracts across multiple EVM chains with the same deterministic address.",
    tags: ["Deployment", "CREATE2", "Tasks"],
  },
  {
    name: "@tovarishfin/hardhat-yul",
    author: "tovarishfin",
    authorUrl: "https://codylamson.com",
    description:
      "An updated and working Hardhat plugin to compile the Yul and Yul+ languages into solc compatible artifacts. Works with .yul and .yulp file extensions",
    tags: ["Yul", "Assembly", "Compiler", "Yul+"],
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
  {
    name: "hardhat-output-validator",
    author: "Indeavr",
    authorUrl: "https://github.com/indeavr",
    description:
      "Zero-config Hardhat plugin to check the output of the compiler for any problems like missing NatSpec",
    tags: [
      "Productivity",
      "CI",
      "Compiler",
      "Docs",
      "Solidity",
      "NatSpec",
      "Build",
    ],
  },
  {
    name: "@ericxstone/hardhat-blockscout-verify",
    author: "ericxstone",
    authorUrl: "https://github.com/ericxstone",
    description:
      "Hardhat plugin for solidity contract verification on Blockscout block explorer.",
    tags: ["Blockscout", "Deployment", "Solidity", "Verification"],
  },
  {
    name: "@muzamint/hardhat-etherspot",
    author: "muzamint",
    authorUrl: "https://github.com/muzamint",
    description: "Hardhat TypeScript plugin for Etherspot",
    tags: ["smart contract wallet"],
  },
  {
    name: "hardhat-multibaas-plugin",
    author: "Curvegrid",
    authorUrl: "https://www.curvegrid.com/",
    description: "Integrate MultiBaas into Hardhat's workflow!",
    tags: ["middleware", "ethereum", "OMG"],
  },
  {
    name: "@mangrovedao/hardhat-test-solidity",
    author: "Mangrove",
    authorUrl: "https://mangrove.exchange/",
    description: "Hardhat plugin for writing tests in solidity",
    tags: ["solidity tests"],
  },
  {
    name: "@reef-defi/hardhat-reef",
    author: "Reef Chain",
    authorUrl: "https://reef.io/",
    description:
      "Hardhat Reef plugin for interacting with contracts on the Reef chain",
    tags: ["Reef Chain"],
  },
  {
    name: "hardhat-diamond-abi",
    author: "Project Sophon",
    authorUrl: "https://github.com/projectsophon",
    description:
      "Hardhat plugin to combine multiple ABIs into a Diamond ABI artifact",
    tags: ["diamond standard"],
  },
  {
    name: "@idle-finance/hardhat-proposals-plugin",
    author: "Idle Finance",
    authorUrl: "https://idle.finance/",
    description: "A Hardhat plugin for working with on-chain proposals",
    tags: ["governance", "proposals", "simulation"],
  },
  {
    name: "@shardlabs/starknet-hardhat-plugin",
    author: "Shard Labs",
    authorUrl: "https://shardlabs.io/",
    description:
      "A plugin for integrating Starknet tools into Hardhat projects",
    tags: ["starknet", "cairo", "layer two"],
  },
  {
    name: "@uniswap/hardhat-v3-deploy",
    author: "Uniswap Labs",
    authorUrl: "https://uniswap.org/",
    description: "Hardhat plugin for Uniswap V3 deployment",
    tags: ["uniswap", "testing", "deployment", "local"],
  },
  {
    name: "@unlock-protocol/hardhat-plugin",
    author: "Unlock Inc",
    authorUrl: "http://unlock-protocol.com/",
    description: "Hardhat plugin for Unlock Protocol deployments.",
    tags: ["unlock", "nft", "memberships", "udt", "testing", "deployment"],
  },
  {
    name: "hardhat-deploy-tenderly",
    author: "Ronan Sandford",
    authorUrl: "https://github.com/wighawag",
    description: "A plugin to push contracts to tenderly",
    tags: ["Deployment", "Testing", "Tenderly", "Verification"],
  },
  {
    name: "hardhat-laika",
    author: "Laika Blockchain Lab",
    authorUrl: "https://github.com/laika-lab/hardhat-laika",
    description: "Hardhat plugin to sync your compiled contract with Laika",
    tags: ["Tasks", "Laika"],
  },
  {
    name: "hardhat-network-metadata",
    author: "Focal Labs Inc.",
    authorUrl: "https://github.com/krruzic/hardhat-network-metadata",
    description:
      "Hardhat plugin to allow adding any extra data to your network configuration",
    tags: ["Metadata", "Testing", "Tasks", "Config"],
  },
  {
    name: "hardhat-exposed",
    author: "Francisco Giordano",
    authorUrl: "https://github.com/frangio",
    description: "Automatically expose internal Solidity functions for testing",
    tags: ["Solidity", "Testing"],
  },
  {
    name: "hardhat-hethers",
    author: "LimeChain",
    authorUrl: "https://github.com/LimeChain/hardhat-hethers",
    description: "Injects hethers into the Hardhat Runtime Environment",
    tags: ["Hedera", "hethers"],
  },
  {
    name: "hardhat-sourcify",
    author: "Zoey T",
    authorUrl: "https://twitter.com/zzzzoey_t",
    description: "A plugin for submitting code to Sourcify",
    tags: ["Sourcify", "Verification"],
  },
  {
    name: "hardhat-awesome-cli",
    author: "Marc-Aurele Besner",
    authorUrl: "https://github.com/marc-aurele-besner",
    description:
      "Hardhat made awesome with a flexible CLI to help run tests, scripts, deploy Mock contracts and more.",
    tags: ["CLI", "Testing", "Tasks", "Config"],
  },
  {
    name: "hardhat-test-utils",
    author: "Naveen Sahu",
    authorUrl: "https://twitter.com/heyNvN",
    description:
      "Handy set of utilities for testing contracts in Hardhat projects",
    tags: ["testing", "solidity"],
  },
  {
    name: "hardhat-deals",
    author: "use less",
    authorUrl: "https://github.com/Karuzzzo",
    description: "Small hardhat task for debug money transfers 🤝💰",
    tags: ["Deployment", "Testing", "Security", "Debug", "helper", "Tasks"],
  },
  {
    name: "hardhat-contract-dumper",
    author: "use less",
    authorUrl: "https://github.com/Karuzzzo",
    description:
      "Another small hardhat task for printing contract's storage layout 📐",
    tags: ["Deployment", "Testing", "Security", "Debug", "helper", "Tasks"],
  },
  {
    name: "@0xweb/hardhat",
    author: "Alex Kit",
    authorUrl: "https://github.com/tenbits",
    description:
      "Generate 0xWeb classes for contracts to easily communicate with the blockchain.",
    tags: ["dApp-Client", "Class-Generation", "Testing"],
  },
  {
    name: "jest-environment-hardhat",
    author: "Uniswap Labs",
    authorUrl: "https://uniswap.org/",
    description: "A jest environment with hardhat built in.",
    tags: ["uniswap", "testing", "jest", "node"],
  },
  {
    name: "hardhat-ctf",
    author: "Oren Yomtov",
    authorUrl: "https://github.com/orenyomtov",
    description: "A framework for building solidity CTF challenges.",
    tags: ["ctf", "capture-the-flag", "framework", "security", "solidity"],
  },
  {
    name: "hardhat-contract-prompts",
    author: "dbadoy",
    authorUrl: "https://github.com/dbadoy",
    description: "Build prompt with Solidity code.",
    tags: ["solidity", "CLI"],
  },
  {
    name: "hardhat-address-exporter",
    author: "Dennis Zoma",
    authorUrl: "https://twitter.com/dennis_zoma",
    description:
      "Export deployed contract addresses (multichain) in typescript files.",
    tags: [
      "solidity",
      "vyper",
      "deployment",
      "typescript",
      "addresses",
      "monorepo",
      "frontend",
    ],
  },
  {
    name: "@graphprotocol/hardhat-graph",
    author: "The Graph",
    authorUrl: "https://thegraph.com",
    description:
      "Develop your subgraph side by side with your contracts to save gas and increase productivity.",
    tags: ["graphprotocol", "subgraph", "graphql", "development", "deployment"],
  },
  {
    name: "hardhat-storage-layout-changes",
    author: "Soham Zemse",
    authorUrl: "https://github.com/zemse/",
    description: "Check for storage layout changes",
    tags: ["Storage Layout", "Solidity", "Upgradable Contracts"],
  },
  {
    name: "hardhat-live-fork",
    author: "Soham Zemse",
    authorUrl: "https://github.com/zemse/",
    description:
      "Keeps mainnet fork state updated by replaying relevant live txs",
    tags: ["Mainnet fork", "live", "transaction replay"],
  },
  {
    name: "hardhat-ens-mock",
    author: "DefiCake",
    authorUrl: "https://github.com/DefiCake",
    description:
      "Overrides ENS ownership in hardhat network to allow orchestration superpowers",
    tags: ["ENS", "Testing", "Orchestration", "Productivity"],
  },
  {
    name: "hardhat-cannon",
    author: "Synthetix Core Contributors",
    authorUrl: "https://github.com/dbeal-eth",
    description:
      "Define your project's deployment in a simple manifest, then deploy and share it anywhere. Inspired by Docker, Terraform, and npm. https://usecannon.com/",
    tags: ["Tooling", "Deployment", "Testing"],
  },
  {
    name: "hardhat-etherscan-contract-cloner",
    author: "Tuckson",
    authorUrl: "https://github.com/TucksonDev",
    description:
      "Hardhat plugin for cloning verified contracts from any supported network using Etherscan's API.",
    tags: ["Etherscan", "Clone", "Smart contract"],
  },
  {
    name: "hardhat-interact",
    author: "Synthetix Core Contributors",
    authorUrl: "https://github.com/dbeal-eth",
    description:
      "Execute commands on deployed contracts on any network using a helpful TUI.",
    tags: ["Tooling", "Operations", "Testing"],
  },
  {
    name: "hardhat-chainlink-plugin",
    author: "protofire.io",
    authorUrl: "https://protofire.io/",
    description:
      "Hardhat TypeScript plugin to run a chainlink node and interact with it",
    tags: ["ethereum", "smart-contracts", "chainlink", "hardhat-plugin"],
  },
  {
    name: "huff-deployer",
    author: "Rodrigo Herrera",
    authorUrl: "https://github.com/rodrigoherrerai",
    description:
      "A Hardhat Typescript plugin to test and interact with Huff contracts",
    tags: ["Deployment", "Tasks", "Huff"],
  },
  {
    name: "hardhat-gui",
    author: "yecandir",
    authorUrl: "https://github.com/yecandir",
    description:
      "Hardhat React Plugin to interact with your deployed contracts",
    tags: ["Tooling", "Testing", "ui", "plugin"],
  },
  {
    name: "hardhat-finder",
    author: "Emre Tepe",
    authorUrl: "https://emretepedev.github.io/",
    description: "Hardhat plugin to get compiler outputs of contracts",
    tags: ["Tooling", "Testing", "Tasks", "Scripts", "Solc", "Compiler"],
  },
  {
    name: "@dlsl/hardhat-migrate",
    author: "Distributed Lab",
    authorUrl: "https://distributedlab.com/",
    description:
      "Hardhat plugin to automate the deployment and verification of contracts",
    tags: ["Deployment", "Verification", "Migration"],
  },
  {
    name: "hardhat-notifier",
    author: "Mister Singh",
    authorUrl: "https://www.npmjs.com/package/hardhat-notifier",
    description:
      "Hardhat plugin to send an OSX notification when hardhat compilcation fails/succeeds",
    tags: ["Deployment", "Tooling", "Notification", "Compile"],
  },
  {
    name: "hardhat-jest",
    author: "Arian Hosseini",
    authorUrl: "https://www.npmjs.com/package/hardhat-jest",
    description: "Hardhat plugin that allows you to use Jest easily",
    tags: ["Deployment", "Testing", "Jest", "Smart Contracts", "Solidity"],
  },
  {
    name: "@dlsl/hardhat-gobind",
    author: "Distributed Lab",
    authorUrl: "https://distributedlab.com/",
    description:
      "Hardhat plugin to generate smart contract bindings for Golang",
    tags: ["Bindings", "Go", "Testing"],
  },
  {
    name: "hardhat-storage-vault",
    author: "Emre Tepe",
    authorUrl: "https://emretepedev.github.io/",
    description:
      "Hardhat plugin to check and lock the storage layout of contracts",
    tags: ["Tooling", "Testing", "Storage"],
  },
  {
    name: "hardhat-insight",
    author: "Andres Adjimann",
    authorUrl: "https://www.npmjs.com/package/hardhat-insight",
    description:
      "Hardhat plugin to get contract storage, gas and code size insights using the compiler ast output",
    tags: ["Tooling", "Storage", "Gas", "Size", "Bytecode"],
  },
  {
    name: "hardhat-scilla-plugin",
    author: "Saeed Dadkhah",
    authorUrl: "https://www.github.com/its-saeed",
    description:
      "Hardhat plugin to test scilla contracts. Scilla is Zillqa's programming language to develop smart contracts.",
    tags: ["Scilla", "Testing", "Zilliqa"],
  },
  {
    name: "hardhat-flat-exporter",
    author: "Laz",
    authorUrl: "https://github.com/Saszr",
    description: "Export flat contract on compilation via Hardhat.",
    tags: ["Flatten", "Smart contract", "Solidity", "Deployment"],
  },
  {
    name: "@chainlink/hardhat-chainlink",
    author: "Chainlink Labs",
    authorUrl: "https://github.com/smartcontractkit/hardhat-chainlink",
    description: "Integrates Chainlink into Hardhat projects.",
    tags: ["chainlink", "hardhat"],
  },
  {
    name: "@dlsl/hardhat-markup",
    author: "Distributed Lab",
    authorUrl: "https://distributedlab.com/",
    description:
      "Hardhat plugin to generate customizable smart contracts documentation",
    tags: ["Documentation", "NatSpec", "Markdown"],
  },
  {
    name: "hardhat-contract-clarity",
    author: "Marc-Aurele Besner",
    authorUrl: "https://github.com/marc-aurele-besner",
    description:
      "This Hardhat plugin add 3 tasks to Hardhat, to summarize a smart contract in human readable format using OpenAI GPT-3, to create a readme looking at your package.json and a task to ask question to chatGPT when running into errors.",
    tags: ["chatGPT", "openai", "gpt3", "ai"],
  },
  {
    name: "transaction-retry-tool",
    author: "Marc-Aurele Besner",
    authorUrl: "https://github.com/marc-aurele-besner",
    description:
      "This Hardhat plugin provides two tasks and two functions to help you manage and optimize your transactions on Ethereum compatible blockchain. The two tasks include the ability to retry a transaction and retrieve the current gas cost.",
    tags: ["transaction", "gasPrice", "retry", "helper"],
  },
  {
    name: "hardhat-fireblocks",
    author: "Fireblocks",
    authorUrl: "https://github.com/fireblocks",
    description: "Hardhat plugin for integrating with Fireblocks",
    tags: ["Deployment", "Security"],
  },
  {
    name: "hardhat-uniswap-v2-deploy-plugin",
    author: "Cyrille Derché",
    authorUrl: "https://github.com/onmychain/hardhat-uniswap-v2-deploy-plugin",
    description:
      "Hardhat plugin for Uniswap V2 (pancakeswap protocol) testing and deployment. You can use it to test features such as pair creation, liquidity provisioning, and swaps.",
    tags: ["uniswap", "pancakeswap", "testing", "deployment", "automated"],
  },
  {
    name: "hardhat-deal",
    author: "Rubilmax",
    authorUrl: "https://github.com/rubilmax/hardhat-deal",
    description:
      "Hardhat plugin to ease dealing ERC20 tokens in hardhat forks.",
    tags: [
      "erc20",
      "deal",
      "foundry",
      "forge",
      "mock",
      "balanceOf",
      "fork",
      "testing",
      "tests",
    ],
  },
  {
    name: "@truffle/dashboard-hardhat-plugin",
    author: "Truffle",
    authorUrl: "https://trufflesuite.com/",
    description:
      "Enable project-specific features inside Truffle Dashboard, including advanced calldata decoding and more",
    tags: ["truffle-dashboard", "transaction", "signing", "decoding"],
  },
];

const officialPlugins: IPlugin[] = [
  {
    name: "@nomicfoundation/hardhat-toolbox",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description: "Nomic Foundation's recommended bundle of Hardhat plugins",
    tags: ["Hardhat", "Setup"],
  },
  {
    name: "@nomicfoundation/hardhat-chai-matchers",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description: "Adds Ethereum-related matchers to Chai",
    tags: ["Chai", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-ethers",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description: "Injects ethers.js into the Hardhat Runtime Environment",
    tags: ["Ethers.js", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomicfoundation/hardhat-verify",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description: "Automatically verify contracts",
    tags: ["Etherscan", "Verification"],
  },
  {
    name: "@nomicfoundation/hardhat-foundry",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description:
      "Makes it easier to use Hardhat and Foundry in the same project",
    tags: ["Foundry"],
  },
  {
    name: "@nomiclabs/hardhat-vyper",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description: "Adds support to compile Vyper smart contracts",
    tags: ["Vyper", "Compiler"],
  },
  {
    name: "@nomiclabs/hardhat-solhint",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description: "Easily run solhint to lint your Solidity code",
    tags: ["Solhint", "Linter"],
  },
  {
    name: "@nomiclabs/hardhat-solpp",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description:
      "Automatically run the solpp preprocessor before each compilation",
    tags: ["Solpp", "Preprocessor"],
  },
  {
    name: "@nomiclabs/hardhat-waffle",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description:
      "Adds a Waffle-compatible provider to the Hardhat Runtime Environment and automatically initializes the Waffle Chai matchers",
    tags: ["Waffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-web3",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description: "Injects Web3 1.x into the Hardhat Runtime Environment",
    tags: ["Web3.js", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-truffle5",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description: "Integration with TruffleContract from Truffle 5",
    tags: ["Truffle", "Testing"],
  },
  {
    name: "@nomiclabs/hardhat-web3-legacy",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description: "Injects Web3 0.20.x into the Hardhat Runtime Environment",
    tags: ["Web3.js", "Legacy", "Testing", "Tasks", "Scripts"],
  },
  {
    name: "@nomiclabs/hardhat-truffle4",
    author: "Nomic Foundation",
    authorUrl: "https://twitter.com/NomicFoundation",
    description: "Integration with TruffleContract from Truffle 4",
    tags: ["Truffle", "Testing"],
  },
  // Don't add community plugins here. They should be placed in the other array.
];

const plugins = {
  communityPlugins,
  officialPlugins,
};

export default plugins;
