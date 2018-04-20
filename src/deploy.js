const { getContract, getContractBytecode } = require("./artifacts");

async function deploy(contract, contractBytecode, ...params) {
  const { web3 } = require("./env");

  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];

  const gas = await contract
    .deploy({
      data: contractBytecode.object,
      arguments: params
    })
    .estimateGas({ from });

  return await contract
    .deploy({
      data: contractBytecode.object,
      arguments: params
    })
    .send({ from, gas });
}

async function deployByName(contractName, ...params) {
  return deploy(
    getContract(contractName),
    getContractBytecode(contractName),
    ...params
  );
}

module.exports = { deploy, deployByName };
