import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";

export function open(filePath: string): void {
  try {
    switch (os.platform()) {
      case "win32":
        spawnSync("cmd", ["/c", "start", "", filePath], { stdio: "ignore", windowsHide: true });
        break;
      case "darwin":
        execFileSync("open", [filePath], { stdio: "ignore" });
        break;
      default:
        execFileSync("xdg-open", [filePath], { stdio: "ignore" });
    }
  } catch {
    // do nothing
  }
}
