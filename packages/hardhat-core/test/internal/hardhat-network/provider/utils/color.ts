import { Chalk } from "chalk";

export function ansiColor(text: string, color: Chalk): string {
  const formatted = color(text);

  const isEdr = process.env.HARDHAT_EXPERIMENTAL_VM_MODE === "edr";
  if (isEdr) {
    // EDR's ansi console crate uses the RESET code to reset the color
    return formatted.replace("\x1B[39m", "\x1B[0m");
  } else {
    return formatted;
  }
}
