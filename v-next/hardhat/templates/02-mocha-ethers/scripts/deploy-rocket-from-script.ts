import apolloModule from "../../../../example-project/ignition/modules/Apollo.js";
import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import hardhatIgnitionEthersPlugin from "@ignored/hardhat-vnext-ignition-ethers";

const hre = await createHardhatRuntimeEnvironment({
  plugins: [hardhatIgnitionEthersPlugin],
});

const { ignition } = await hre.network.connect();

const { apollo } = await ignition.deploy(apolloModule);

const address = await apollo.getAddress();
const name = await apollo.name();
const status = await apollo.status();

console.log(
  `Deployed rocket with Ignition and Ethers from a Hardhat Script 🚀

  address: ${address}
  name: ${name}
  status: ${status}`,
);
