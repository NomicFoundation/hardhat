import { getHardhatProvider, assertTxHash } from "../utils";

export async function dropTransaction(txHash: string): Promise<boolean> {
  const provider = await getHardhatProvider();

  assertTxHash(txHash);

  return (await provider.request({
    method: "hardhat_dropTransaction",
    params: [txHash],
  })) as boolean;
}
