import { HardhatNetworkProvider } from "../../../../src/internal/hardhat-network/provider/provider";

/* eslint-disable @typescript-eslint/dot-notation */

export async function retrieveLatestBlockNumber(
  provider: HardhatNetworkProvider
): Promise<number> {
  if (provider["_node"] === undefined) {
    await provider["_init"]();
  }

  const context = provider["_node"]?.["_context"];
  if (context === undefined) {
    throw new Error("Provider has not been initialised");
  }

  return Number(await context.blockchain().getLatestBlockNumber());
}
