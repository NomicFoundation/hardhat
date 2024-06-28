import { getHardhatVersion } from "../utils/package.js";

export async function printVersionMessage(
  print: (message: string) => void = console.log,
): Promise<void> {
  print(await getHardhatVersion());
}
