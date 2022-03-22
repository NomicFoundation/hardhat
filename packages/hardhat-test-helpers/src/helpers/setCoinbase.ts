import { getHardhatProvider, assertValidAddress } from "../utils";

export async function setCoinbase(hexAddress: string): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(hexAddress);

  await provider.request({
    method: "hardhat_setCoinbase",
    params: [hexAddress],
  });
}
