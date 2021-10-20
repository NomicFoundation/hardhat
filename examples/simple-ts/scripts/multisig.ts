import hre from "hardhat";

import Multisig from "../ignition/Multisig"

async function main() {
  const { owned } = await hre.ignition.deploy(Multisig)

  console.log((await owned.count()).toString());
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
