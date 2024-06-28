import { getHardhatVersion } from "../utils/package.js";

export async function printVersionMessage(
  print: (message?: any, ...optionalParams: any[]) => void = console.log,
): Promise<void> {
  print(await getHardhatVersion());
}
