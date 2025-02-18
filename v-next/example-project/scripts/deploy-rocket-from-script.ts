import hre from "@ignored/hardhat-vnext";

import apolloModule from "../ignition/modules/Apollo.js";

const { ignition } = await hre.network.connect();

const { apollo } = await ignition.deploy(apolloModule);

// @ts-ignore -- this will fail until the first compilation of contracts
const address = apollo.address;
// @ts-ignore -- this will fail until the first compilation of contracts
const name = await apollo.read.name();
// @ts-ignore -- this will fail until the first compilation of contracts
const status = await apollo.read.status();

console.log(
  `Deployed rocket with Ignition and Viem from a Hardhat Script 🚀

  address: ${address}
  name: ${name}
  status: ${status}`,
);

console.log("\nWe have Viem type support for the contracts Ignition deployed!");
try {
  console.log("\nCalling a non-existent function shows as a type error.");
  // @ts-expect-error -- this function doesn't exist on the contract
  await apollo.read.nonexistant();
} catch (e) {
  if (!(e instanceof Error) || !("shortMessage" in e)) {
    throw new Error("Expected Viem to throw an error");
  }

  console.log(`It causes Viem to throw:\n\n${e.shortMessage}`);
}
