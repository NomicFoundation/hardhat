import { execSync } from "node:child_process";
import os from "node:os";

export function open(filePath: string): void {
  let command: string;
  switch (os.platform()) {
    case "win32":
      command = "start";
      break;
    case "darwin":
      command = "open";
      break;
    default:
      command = "xdg-open";
  }

  try {
    execSync(`${command} ${filePath}`, { stdio: "ignore" });
  } catch {
    // do nothing
  }
}
