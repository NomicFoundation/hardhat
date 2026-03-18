import { execFileSync, execSync } from "node:child_process";
import { resolve } from "node:path";

export const ROOT_DIR = resolve(import.meta.dirname, "../../..");

const whichCache = new Map<string, string>();

export function which(command: string): string {
  let cached = whichCache.get(command);

  if (cached === undefined) {
    cached = execSync(`which ${command}`, { encoding: "utf-8" }).trim();
    whichCache.set(command, cached);
  }

  return cached;
}

export function git(args: string[], cwd?: string): string {
  return execFileSync(which("git"), args, {
    encoding: "utf-8",
    cwd,
  }).trim();
}
