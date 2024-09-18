import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";

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
