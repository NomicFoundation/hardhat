import {
  getHardhatProvider,
  assertValidAddress,
  assertHexString,
} from "../utils";

export async function setCode(hexAddress: string, code: string): Promise<void> {
  const provider = await getHardhatProvider();

  assertValidAddress(hexAddress);
  assertHexString(code);

  await provider.request({
    method: "hardhat_setCode",
    params: [hexAddress, code],
  });
}
