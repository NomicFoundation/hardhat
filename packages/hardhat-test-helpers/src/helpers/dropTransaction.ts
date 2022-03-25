import { getHardhatProvider, assertHexString } from "../utils";

export async function dropTransaction(txHash: string): Promise<void> {
  const provider = await getHardhatProvider();

  assertHexString(txHash);

  await provider.request({
    method: "hardhat_dropTransaction",
    params: [txHash],
  });
}
