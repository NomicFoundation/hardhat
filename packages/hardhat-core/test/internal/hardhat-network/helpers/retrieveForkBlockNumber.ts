/* eslint-disable @typescript-eslint/dot-notation */

// EDR-TODO: this should be adapted or removed
export async function retrieveLatestBlockNumber(
  provider: any
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
