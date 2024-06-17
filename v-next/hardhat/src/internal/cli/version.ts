import { getHardhatVersion } from "../utils/package.js";

export async function printVersionMessage(print = console.log) {
  print(await getHardhatVersion());
}
