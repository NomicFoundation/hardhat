import { network } from "hardhat";

async function main() {
  const { networkHelpers, viem } = await network.connect();

  // network helpers should be available
  await networkHelpers.mine();

  // viem should be available
  await viem.getWalletClients();
}

main();
