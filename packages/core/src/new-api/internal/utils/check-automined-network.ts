import { EIP1193Provider } from "../../types/provider";

export async function checkAutominedNetwork(
  provider: EIP1193Provider
): Promise<boolean> {
  const isHardhat = Boolean(
    await provider.request({ method: "hardhat_getAutomine" })
  );

  if (isHardhat) {
    return true;
  }

  const isGanache = /ganache/i.test(
    (await provider.request({ method: "web3_clientVersion" })) as string
  );

  if (isGanache) {
    return true;
  }

  return false;
}
