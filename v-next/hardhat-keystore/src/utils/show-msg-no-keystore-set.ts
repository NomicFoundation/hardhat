import type { RawInterruptions } from "../types.js";

import chalk from "chalk";

export async function showMsgNoKeystoreSet(
  interruptions: RawInterruptions,
): Promise<void> {
  await interruptions.info(
    `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
  );
}
