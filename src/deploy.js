const { getContract, getContractBytecode } = require("./artifacts");

async function deploy(web3, contract, contractBytecode, ...params) {
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

async function deployByName(web3, contractName, ...params) {
  return deploy(
    web3,
    getContract(contractName),
    getContractBytecode(contractName),
    ...params
  );
}

module.exports = { deploy, deployByName };
