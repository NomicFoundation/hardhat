import { network } from "hardhat";

const { networkHelpers, viem } = await network.create();

// network helpers should be available
await networkHelpers.mine();

// viem should be available
await viem.getWalletClients();
