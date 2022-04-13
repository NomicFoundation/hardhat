import { getHardhatProvider } from "../../utils";

/**
 * Returns the timestamp of the latest block
 */
export async function latest(): Promise<number> {
  const provider = await getHardhatProvider();

  const height = (await provider.request({
    method: "eth_blockNumber",
    params: [],
  })) as string;

  const latestBlock = (await provider.request({
    method: "eth_getBlockByNumber",
    params: [height, false],
  })) as { timestamp: string };

  return parseInt(latestBlock.timestamp, 16);
}
