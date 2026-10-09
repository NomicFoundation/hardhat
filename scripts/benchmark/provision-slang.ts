import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const USAGE = `
scripts/benchmark/provision-slang.ts — Put the slang compiler under test into
a scenario checkout

DESCRIPTION
  Copies the slang binary named by $HARDHAT_SLANG_BENCH_BINARY to --out. The
  wrapper configs' "slang" profile points at that path through
  hardhat-slang's \`path\` compiler option. There is no slang release to
  download yet, so the binary is a local build.

OPTIONS
  --out <path>  Required. Where to install the binary.

EXAMPLE
  HARDHAT_SLANG_BENCH_BINARY=~/.cache/hardhat-slang-benchmark/slang-cc66c013 \\
    node scripts/benchmark/provision-slang.ts --out "$PWD/.solx/slang"
`;

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length !== 2 || argv[0] !== "--out") {
    console.error(USAGE);
    process.exit(1);
  }
  const out = path.resolve(argv[1]);

  const binary = process.env.HARDHAT_SLANG_BENCH_BINARY;
  if (binary === undefined || binary === "") {
    console.error(
      "provision-slang: HARDHAT_SLANG_BENCH_BINARY is not set; point it at a slang build",
    );
    process.exit(1);
  }
  if (!existsSync(binary)) {
    console.error(`provision-slang: no file at ${binary}`);
    process.exit(1);
  }

  mkdirSync(path.dirname(out), { recursive: true });
  copyFileSync(binary, out);
  chmodSync(out, 0o755);
  console.log(`provision-slang: installed ${binary} at ${out}`);
}

main();
