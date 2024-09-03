import { network } from "@ignored/hardhat-vnext";

// This network connection has access to an optimism-specific viem api
const optimism = await network.connect("localhost", "optimism");
optimism.viem.client.getL1BaseFee({ chain: null });

// This one doesn't
const mainnet = await network.connect("localhost", "l1");
// @ts-expect-error
mainnet.viem.client.getL1BaseFee({ chain: null });
