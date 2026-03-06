import { execFileSync, execSync, type StdioOptions } from "node:child_process";
import { resolve } from "node:path";

export const ROOT_DIR = resolve(import.meta.dirname, "../../..");
export const VERDACCIO_DIR = resolve(ROOT_DIR, ".verdaccio");
export const VERDACCIO_CONFIG = resolve(VERDACCIO_DIR, "config.yaml");
export const VERDACCIO_STORAGE = resolve(VERDACCIO_DIR, "storage");
export const VERDACCIO_HTPASSWD = resolve(VERDACCIO_DIR, "htpasswd");
export const VERDACCIO_LOG = resolve(VERDACCIO_DIR, "server.log");
export const VERDACCIO_PID_FILE = resolve(VERDACCIO_DIR, "verdaccio.pid");
export const VERDACCIO_NPMRC = resolve(VERDACCIO_DIR, ".npmrc");
export const VERDACCIO_SERVER = resolve(import.meta.dirname, "../server.ts");
export const VERDACCIO_HOST = "127.0.0.1";
export const VERDACCIO_PORT = 4873;
export const VERDACCIO_URL = `http://${VERDACCIO_HOST}:${VERDACCIO_PORT}`;

let gitPath: string | undefined;

let npmPath: string | undefined;

let pnpmPath: string | undefined;

function which(command: string): string {
  return execSync(`which ${command}`, { encoding: "utf-8" }).trim();
}

export function git(args: string[]): string {
  if (gitPath === undefined) {
    gitPath = which("git");
  }

  return execFileSync(gitPath, args, {
    encoding: "utf-8",
    cwd: ROOT_DIR,
  }).trim();
}

export function npm(
  args: string[],
  stdio?: StdioOptions,
  env?: NodeJS.ProcessEnv,
): string {
  if (npmPath === undefined) {
    npmPath = which("npm");
  }

  const result = execFileSync(npmPath, args, {
    encoding: "utf-8",
    cwd: ROOT_DIR,
    stdio,
    env,
  });

  return (result ?? "").trim();
}

export function pnpm(
  args: string[],
  stdio?: StdioOptions,
  env?: NodeJS.ProcessEnv,
): string {
  if (pnpmPath === undefined) {
    pnpmPath = which("pnpm");
  }

  // When stdio is "inherit", execFileSync returns null (stdout is not captured)
  const result = execFileSync(pnpmPath, args, {
    encoding: "utf-8",
    cwd: ROOT_DIR,
    stdio,
    env,
  });

  return (result ?? "").trim();
}
