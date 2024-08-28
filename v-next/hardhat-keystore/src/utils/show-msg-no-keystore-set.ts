import chalk from "chalk";

import { io } from "../ui/io.js";

export function showMsgNoKeystoreSet(): void {
  io.info(
    `No keystore found. Please set one up using ${chalk.blue.italic("npx hardhat keystore set {key}")} `,
  );
}
