const assert = require("assert");
const hre = require("hardhat");

async function main() {
  // can get an artifact that is provided by Hardhat
  const A = await hre.artifacts.readArtifact("A");
  assert.equal(A.contractName, "A");

  // can get an artifact  that is provided by an extension
  const B = await hre.artifacts.readArtifact("B");
  assert.equal(B.contractName, "B");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
