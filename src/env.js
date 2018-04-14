const path = require("path");
const fs = require("fs-extra");

const { getConfig } = require("./config");

const config = getConfig();

const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(config.web3Provider));

async function getContract(name) {
  const abiPath = path.join(
    config.root,
    "artifacts",
    "abi",
    "contracts",
    `${name}.json`
  );

  const abi = await fs.readJson(abiPath);
  return new web3.eth.Contract(abi);
}

async function getContractCode(name) {
  const bytecodePath = path.join(
    config.root,
    "artifacts",
    "bytecode",
    "contracts",
    `${name}.json`
  );

  const bytecode = await fs.readJson(bytecodePath);
  return bytecode.object;
}

const deploy = require("./deploy")

module.exports = {
  config,
  web3,
  getContract,
  getContractCode,
  deploy
};
