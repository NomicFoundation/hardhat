console.log("Sool env's web3 provider's host:", web3.currentProvider.host);

const Contract = artifacts.require("Contract");
const ContractWithALib = artifacts.require("ContractWithALib");
const L = artifacts.require("L");

async function main() {
  const l = await L.new();
  artifacts.link(ContractWithALib, l);

  const contractWithALib = await ContractWithALib.new();
  console.log(contractWithALib.address);
}

main().catch(console.error);
