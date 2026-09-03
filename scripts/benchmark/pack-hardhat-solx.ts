import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import path from "node:path";

const USAGE = `
scripts/benchmark/pack-hardhat-solx.ts — Wire the monorepo's
hardhat-slang-solx into a scenario checkout

DESCRIPTION
  hardhat-slang-solx is \`private\` and excluded from the Verdaccio publish
  set, so it never reaches the registry. This script packs it instead (pack ignores
  \`private\`) and wires the tarball into the target package as a file:
  devDependency. Solx scenario preinstall scripts (any end-to-end/ dir with a
  hardhat.config.solx.ts, conventionally named <project>-solx) run it
  inside the cloned repo checkout. Concretely, it:

  - packs packages/hardhat-slang-solx with \`pnpm pack\` — not \`npm pack\` —
    so the plugin's \`workspace:\` deps are rewritten to real version ranges and its
    own dependencies (hardhat-errors/utils/zod-utils, peer hardhat) still
    resolve from the registry like every other scenario dependency;
  - starts from an empty <target-dir>/.solx, so the tarball just produced is
    the only thing that can be there (a stale one from a prior run would
    make the rename ambiguous);
  - names the tarball by content hash (hardhat-slang-solx-<12-hex>.tgz): npm
    never re-reads a changed \`file:\` tarball when the spec and the packed version
    are unchanged (this froze aave's shipped plugin at a stale version map
    on the persistent runner), so a content change must change the spec;
  - \`npm pkg set\`s the file: devDependency — package.json only, no lockfile
    involved — running inside the target dir so the spec stays relative to
    the declaring package, which is how pnpm resolves file: deps in a
    workspace;
  - copies the plugin's dist/src to <target-dir>/.solx/expected-dist-src,
    the freshness oracle for the scenarios' "assert fresh hardhat-slang-solx"
    prime step (the installed plugin must match this monorepo build
    byte-for-byte).

OPTIONS
  --target-dir <dir>  Required. The package dir that consumes the plugin:
                      the checkout root, or the workspace package for
                      monorepo scenarios (e.g. graph-horizon-solx's
                      packages/horizon)

EXAMPLE
  node scripts/benchmark/pack-hardhat-solx.ts --target-dir "$PWD"
`;

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.log(USAGE);
    process.exit(1);
  }

  const fail = (message: string): never => {
    console.error(`pack-hardhat-solx: ${message}`);
    console.error(USAGE);
    process.exit(1);
  };

  let targetDirArg: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== "--target-dir") {
      fail(`unknown option "${argv[i]}" (known: --target-dir)`);
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      fail("--target-dir requires a value");
    }
    i++;
    targetDirArg = value;
  }
  if (targetDirArg === undefined) {
    fail("--target-dir is required");
  }
  const targetDir = path.resolve(targetDirArg);

  // Pre-flight before touching anything: a typo'd --target-dir would
  // otherwise get a .solx dir and a packed tarball, then die on `npm pkg set`
  // with an unrelated-looking npm error.
  if (!existsSync(path.join(targetDir, "package.json"))) {
    fail(
      `no package.json at ${targetDir} — --target-dir must be the package that consumes the plugin (see USAGE)`,
    );
  }

  const monorepoRoot = path.resolve(import.meta.dirname, "..", "..");
  const solxPkg = path.join(monorepoRoot, "packages", "hardhat-slang-solx");

  if (!existsSync(path.join(solxPkg, "dist", "src"))) {
    console.error(
      `hardhat-slang-solx dist not found at ${solxPkg}/dist/src — run 'pnpm build' before benchmarking.`,
    );
    process.exit(1);
  }

  const solxDir = path.join(targetDir, ".solx");
  rmSync(solxDir, { recursive: true, force: true });
  mkdirSync(solxDir, { recursive: true });

  execFileSync("pnpm", ["pack", "--pack-destination", solxDir], {
    cwd: solxPkg,
    stdio: "inherit",
  });

  const tarballs = readdirSync(solxDir).filter(
    (name) =>
      name.startsWith("nomicfoundation-hardhat-slang-solx-") &&
      name.endsWith(".tgz"),
  );
  if (tarballs.length !== 1) {
    console.error(
      `pack-hardhat-solx: expected exactly one packed tarball in ${solxDir}, found ${tarballs.length}`,
    );
    process.exit(1);
  }

  const hash = createHash("sha256")
    .update(readFileSync(path.join(solxDir, tarballs[0])))
    .digest("hex")
    .slice(0, 12);
  const tarballName = `hardhat-slang-solx-${hash}.tgz`;
  renameSync(path.join(solxDir, tarballs[0]), path.join(solxDir, tarballName));

  execFileSync(
    "npm",
    [
      "pkg",
      "set",
      `devDependencies.@nomicfoundation/hardhat-slang-solx=file:./.solx/${tarballName}`,
    ],
    { cwd: targetDir, stdio: "inherit" },
  );

  cpSync(
    path.join(solxPkg, "dist", "src"),
    path.join(solxDir, "expected-dist-src"),
    { recursive: true },
  );

  console.log(
    `pack-hardhat-solx: wired @nomicfoundation/hardhat-slang-solx as file:./.solx/${tarballName} into ${targetDir}`,
  );
}

main();
