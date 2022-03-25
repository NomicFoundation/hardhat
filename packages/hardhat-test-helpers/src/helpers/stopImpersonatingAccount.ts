import { getHardhatProvider, assertValidAddress } from "../utils";

export async function stopImpersonatingAccount(
  hexAddress: string
): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(hexAddress);

  await provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [hexAddress],
  });
}
