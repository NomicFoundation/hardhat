import hre from "hardhat";

import Timelock from "../ignition/Timelock"

async function main() {
  const { owned } = await hre.ignition.deploy(Timelock)

  console.log((await owned.count()).toString());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
