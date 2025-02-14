import hre from "@ignored/hardhat-vnext";

import apolloModule from "../ignition/modules/Apollo.js";

const { ignition } = await hre.network.connect();

const { apollo } = await ignition.deploy(apolloModule);

const address = apollo.address;
const name = await apollo.read.name();
const status = await apollo.read.status();

console.log(
  `Deployed rocket with Ignition and Viem from a Hardhat Script 🚀

  address: ${address}
  name: ${name}
  status: ${status}`,
);
