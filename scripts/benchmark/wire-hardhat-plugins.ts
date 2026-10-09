import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const USAGE = `
scripts/benchmark/wire-hardhat-plugins.ts — Declare the monorepo's
hardhat-slang-solx and hardhat-slang in a scenario checkout

DESCRIPTION
  The scenario repos don't depend on either plugin, and --use-local only
  re-pins dependencies a package already declares. This script \`npm pkg
  set\`s each plugin as a devDependency at its workspace version, which the
  Verdaccio publish provides (republished when it changed since its release
  tag, npm's copy otherwise), and copies each plugin's dist/src to
  <target-dir>/.solx/<oracle>: the reference the scenarios' "assert fresh
  <plugin>" prime steps compare the installed plugin against.
  expected-dist-src is hardhat-slang-solx's, expected-slang-dist-src
  hardhat-slang's.

OPTIONS
  --target-dir <dir>  Required. The package dir that consumes the plugins:
                      the checkout root, or the workspace package for
                      monorepo scenarios (e.g. graph-horizon-solx's
                      packages/horizon)

EXAMPLE
  node scripts/benchmark/wire-hardhat-plugins.ts --target-dir "$PWD"
`;

const PLUGINS = [
  { name: "hardhat-slang-solx", oracleDir: "expected-dist-src" },
  { name: "hardhat-slang", oracleDir: "expected-slang-dist-src" },
];

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length !== 2 || argv[0] !== "--target-dir") {
    console.error(USAGE);
    process.exit(1);
  }
  const targetDir = path.resolve(argv[1]);

  // A typo'd --target-dir would otherwise die on `npm pkg set` with an
  // unrelated-looking npm error.
  if (!existsSync(path.join(targetDir, "package.json"))) {
    console.error(
      `wire-hardhat-plugins: no package.json at ${targetDir} — --target-dir must be the package that consumes the plugins (see USAGE)`,
    );
    process.exit(1);
  }

  const monorepoRoot = path.resolve(import.meta.dirname, "..", "..");
  for (const { name, oracleDir } of PLUGINS) {
    const pkgDir = path.join(monorepoRoot, "packages", name);
    const dist = path.join(pkgDir, "dist", "src");
    if (!existsSync(dist)) {
      console.error(
        `wire-hardhat-plugins: ${name} dist not found at ${dist} — run 'pnpm build' before benchmarking.`,
      );
      process.exit(1);
    }
    const { version } = JSON.parse(
      readFileSync(path.join(pkgDir, "package.json"), "utf8"),
    ) as { version: string };

    execFileSync(
      "npm",
      ["pkg", "set", `devDependencies.@nomicfoundation/${name}=${version}`],
      { cwd: targetDir, stdio: "inherit" },
    );

    const oracle = path.join(targetDir, ".solx", oracleDir);
    rmSync(oracle, { recursive: true, force: true });
    cpSync(dist, oracle, { recursive: true });

    console.log(
      `wire-hardhat-plugins: declared @nomicfoundation/${name}@${version} in ${targetDir}`,
    );
  }
}

main();
