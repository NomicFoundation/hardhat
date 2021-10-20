import hre from "hardhat";

import MultisigAndTimelock from "../ignition/MultisigAndTimelock"

async function main() {
  const { owned } = await hre.ignition.deploy(MultisigAndTimelock)

  console.log((await owned.count()).toString());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
