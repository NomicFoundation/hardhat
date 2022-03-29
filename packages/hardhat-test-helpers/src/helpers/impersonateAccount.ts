import { getHardhatProvider, assertValidAddress } from "../utils";

export async function impersonateAccount(address: string): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(address);

  await provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
}
