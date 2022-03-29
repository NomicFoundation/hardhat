import {
  getHardhatProvider,
  assertValidAddress,
  assertHexString,
} from "../utils";

export async function setCode(address: string, code: string): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(address);
  assertHexString(code);

  await provider.request({
    method: "hardhat_setCode",
    params: [address, code],
  });
}
