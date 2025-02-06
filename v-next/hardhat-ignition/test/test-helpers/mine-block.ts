import type { NetworkConnection } from "@ignored/hardhat-vnext/types/network";

export async function mineBlock(
  connection: NetworkConnection<string>,
): Promise<any> {
  return connection.provider.request({ method: "evm_mine", params: [] });
}
