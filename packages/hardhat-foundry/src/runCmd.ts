import { execSync } from "child_process";
import { getPluginError } from "./errors";

export function runCmdSync(cmd: string): string {
  try {
    return execSync(cmd, { stdio: "pipe" }).toString();
  } catch (error) {
    throw getPluginError(error);
  }
}
