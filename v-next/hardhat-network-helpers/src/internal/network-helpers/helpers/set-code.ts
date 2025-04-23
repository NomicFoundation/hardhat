import type { EthereumProvider } from "hardhat/types/providers";

import { assertValidAddress, assertHexString } from "../../assertions.js";

export async function setCode(
  provider: EthereumProvider,
  address: string,
  code: string,
): Promise<void> {
  await assertValidAddress(address);
  assertHexString(code);

  await provider.request({
    method: "hardhat_setCode",
    params: [address, code],
  });
}
