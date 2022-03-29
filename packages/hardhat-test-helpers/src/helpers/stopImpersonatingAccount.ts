import { getHardhatProvider, assertValidAddress } from "../utils";

export async function stopImpersonatingAccount(address: string): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(address);

  await provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [address],
  });
}
