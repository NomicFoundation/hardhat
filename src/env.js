const { getConfig } = require("./config");
const { getWeb3Instance } = require("./network");
const { getContractBytecode, getContract } = require("./artifacts");
const { deploy, deployByName } = require("./deploy");
const { run } = require("./tasks");

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
  web3,
  getContract,
  getContractBytecode,
  deploy,
  deployByName,
  run
};
