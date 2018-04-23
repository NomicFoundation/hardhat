const { getContract, getContractBytecode } = require("./artifacts");

async function estimateDeploymentGas(contract, contractCode, params, from) {
  return await contract
    .deploy({
      data: contractCode,
      arguments: params
    })
    .estimateGas({ from });
}

function link(contractBytecode, libAddresses) {
  let linked = contractBytecode.object;
  const alreadyLinked = [];

  for (const libs of Object.values(contractBytecode.linkReferences)) {
    for (const [libName, positions] of Object.entries(libs)) {
      if (alreadyLinked.includes(libName)) {
        throw new Error(
          "Sool doesn't support linking multiple libraries with the same name" +
            " into a single contract"
        );
      }

      if (libs[libName] === undefined) {
        throw new Error(
          `Contract deployment failed. Library ${libName}'s address missing`
        );
      }

      for (const { start, length } of positions) {
        if (length !== 20) {
          throw new Error("Sool expects libs' addresses lengths to be 20.");
        }

        // Everything is expressed in bytes, but we are replacing in a hex
        // encoded string, hence the * 2.
        linked =
          linked.substr(0, start * 2) +
          libAddresses[libName].slice(2) +
          linked.substr(start * 2 + 20 * 2);
      }
    }
  }

  return linked;
}

async function deploy(web3, contract, contractBytecode, libs, ...params) {
  const accounts = await web3.eth.getAccounts();
  const from = accounts[0];

  let contractCode = contractBytecode.object;
  if (Object.keys(contractBytecode.linkReferences).length === 0) {
    if (libs !== undefined) {
      params.unshift(libs);
    }
  } else {
    contractCode = link(contractBytecode, libs);
  }

  const gas = await estimateDeploymentGas(contract, contractCode, params, from);

  return await contract
    .deploy({
      data: contractCode,
      arguments: params
    })
    .send({ from, gas });
}

async function deployByName(web3, contractName, libs, ...params) {
  return deploy(
    web3,
    getContract(contractName),
    getContractBytecode(contractName),
    ...params
  );
}

module.exports = { deploy, deployByName };
