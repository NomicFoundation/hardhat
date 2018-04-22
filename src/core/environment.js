const Web3 = require("web3");

const { getConfig } = require("./config");
const { getWeb3Instance } = require("./network");
const { deploy, deployByName } = require("./deploy");
const { runTask } = require("./tasks");
const {
  getContract,
  getContractAbi,
  getContractBytecode
} = require("./artifacts");

const config = getConfig();
const web3 = getWeb3Instance(config);

function injectEnvToGlobal() {
  for (const [key, value] of Object.entries(module.exports)) {
    global[key] = value;
  }
}

module.exports = {
  injectEnvToGlobal,
  config,
  Web3,
  web3,
  getContract: getContract.bind(undefined, config, web3),
  getContractAbi: getContractAbi.bind(undefined, config),
  getContractBytecode: getContractBytecode.bind(undefined, config),
  deploy: deploy.bind(undefined, web3),
  deployByName: deployByName.bind(undefined, web3),
  run: (...args) => runTask(module.exports, ...args)
};
