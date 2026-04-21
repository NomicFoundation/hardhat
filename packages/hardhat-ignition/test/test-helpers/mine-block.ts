import type { NetworkConnection } from "hardhat/types/network";

export async function mineBlock(
  connection: NetworkConnection<string>,
): Promise<any> {
  return await connection.provider.request({ method: "evm_mine", params: [] });
}
