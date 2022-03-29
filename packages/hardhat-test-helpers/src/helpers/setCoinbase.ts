import { getHardhatProvider, assertValidAddress } from "../utils";

export async function setCoinbase(address: string): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(address);

  await provider.request({
    method: "hardhat_setCoinbase",
    params: [address],
  });
}
