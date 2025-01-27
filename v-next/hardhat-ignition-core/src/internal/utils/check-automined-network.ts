import type { EIP1193Provider } from "../../types/provider";

export async function checkAutominedNetwork(
  provider: EIP1193Provider,
): Promise<boolean> {
  try {
    const isHardhat = Boolean(
      await provider.request({ method: "hardhat_getAutomine" }),
    );

    if (isHardhat) {
      return true;
    }
  } catch {
    // If this method failed we aren't using Hardhat Network nor Anvil, so we
    // just continue with the next check.
  }

  try {
    const isGanache = /ganache/i.test(
      (await provider.request({ method: "web3_clientVersion" })) as string,
    );

    if (isGanache) {
      return true;
    }
  } catch {
    // If this method failed we aren't using Ganache
  }

  return false;
}
