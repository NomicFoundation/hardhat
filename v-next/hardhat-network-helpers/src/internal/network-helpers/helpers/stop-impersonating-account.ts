import type { EthereumProvider } from "hardhat/types/providers";

import { assertValidAddress } from "../../assertions.js";

export async function stopImpersonatingAccount(
  provider: EthereumProvider,
  address: string,
): Promise<void> {
  await assertValidAddress(address);

  await provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [address],
  });
}
