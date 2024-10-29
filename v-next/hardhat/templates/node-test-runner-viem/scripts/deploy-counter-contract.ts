import hre from "@ignored/hardhat-vnext";

async function deployCounterContract() {
  const optimism = await hre.network.connect("local-base", "optimism");

  const contract = await optimism.ethers.deployContract("Counter");

  console.log("Counter contract address:", await contract.getAddress());
}

deployCounterContract();
