const Web3 = require("web3");

async function deploy(contract, contractCode, ...params) {

  const web3 = new Web3(contract.currentProvider);
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];

  const gas = await contract.deploy({
    data: contractCode,
    arguments: params
  })
    .estimateGas({from});

  return await contract.deploy({
    data: contractCode,
    arguments: params
  })
    .send({from, gas});
}

module.exports = deploy;