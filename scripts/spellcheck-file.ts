import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { styleText } from "node:util";

const ROOT_DIR = resolve(import.meta.dirname, "..");
const PREFIX = "[spellcheck-file]";
const IS_WINDOWS = process.platform === "win32";

const USAGE = `
spellcheck-file - Run cspell on individual files using the repo configuration.

USAGE
  node scripts/spellcheck-file.ts <file...>
  pnpm spellcheck:file <file...>

DESCRIPTION
  Invokes cspell from the repo root so it picks up cspell.config.mts and the
  repo dictionary. No build step is required. The aggregate command
  (pnpm spellcheck) is still the right call when you want full coverage.

EXAMPLES
  pnpm spellcheck:file AGENTS.md
  pnpm spellcheck:file packages/hardhat/src/internal/cli/main.ts
`;

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(USAGE);
    process.exit(0);
  }

  const result = spawnSync(
    "pnpm",
    ["exec", "cspell", "--no-progress", ...args],
    {
      cwd: ROOT_DIR,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
      shell: IS_WINDOWS,
    },
  );

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);

  if (result.status !== 0 && /Files checked: 0\b/.test(stderr)) {
    logError(
      "cspell did not check any of the given paths. They may be symlinks, gitignored, or outside the globs in cspell.config.mts.",
    );
  }

  process.exit(result.status ?? 1);
}

function logError(msg: string): void {
  console.error(styleText("red", `${PREFIX} Error: ${msg}`));
}

if (import.meta.main) {
  main();
}
