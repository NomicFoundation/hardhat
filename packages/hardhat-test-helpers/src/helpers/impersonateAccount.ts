import { getHardhatProvider, assertValidAddress } from "../utils";

export async function impersonateAccount(hexAddress: string): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(hexAddress);

  await provider.request({
    method: "hardhat_impersonateAccount",
    params: [hexAddress],
  });
}
