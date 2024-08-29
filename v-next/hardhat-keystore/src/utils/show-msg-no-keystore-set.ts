import type { RawInterruptions } from "../types.js";

import chalk from "chalk";

export function showMsgNoKeystoreSet(interruptions: RawInterruptions): void {
  interruptions.info(
    `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
  );
}
