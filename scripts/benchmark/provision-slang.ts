import { chmodSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { installVerifiedReleaseAsset } from "./helpers/release-download.ts";

const USAGE = `
scripts/benchmark/provision-slang.ts — Put the slang compiler under test into
a scenario checkout

DESCRIPTION
  Installs the slang binary at --out, where the wrapper configs' "slang"
  profile points through hardhat-slang's \`path\` compiler option.

  By default it downloads the release asset for --tag from
  NomicFoundation/solx's GitHub releases, verified against its .sha256
  sidecar and cached like download-solx.ts. When $HARDHAT_SLANG_BENCH_BINARY
  is set, that local build is copied instead, so an unreleased compiler can
  be benchmarked.

OPTIONS
  --tag <tag>             Required. Release tag (e.g. cc66c013)
  --asset-suffix <sfx>    Required. Asset name suffix after the platform
                          (e.g. slang-debug-symbols)
  --out <path>            Required. Where to install the binary

EXAMPLE
  node scripts/benchmark/provision-slang.ts --tag cc66c013 \\
    --asset-suffix slang-debug-symbols --out "$PWD/.solx/slang"
`;

const RELEASES_BASE_URL = "https://github.com/NomicFoundation/solx/releases";

/**
 * The slang release workflow's asset naming, slang-<platform>-<suffix>.
 * Windows is deliberately unsupported: the benchmark only runs on
 * Linux/macOS.
 */
function getAssetName(assetSuffix: string): string {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === "linux" && arch === "x64") {
    return `slang-linux-amd64-gnu-${assetSuffix}`;
  }
  if (platform === "linux" && arch === "arm64") {
    return `slang-linux-arm64-gnu-${assetSuffix}`;
  }
  if (platform === "darwin") {
    return `slang-macosx-${assetSuffix}`;
  }
  throw new Error(`No slang release asset for ${platform}/${arch}`);
}

async function main(): Promise<void> {
  const getArg = (flag: string): string | undefined => {
    const i = process.argv.indexOf(flag);
    return i !== -1 && i + 1 < process.argv.length
      ? process.argv[i + 1]
      : undefined;
  };

  const tag = getArg("--tag");
  const assetSuffix = getArg("--asset-suffix");
  const out = getArg("--out");
  if (tag === undefined || assetSuffix === undefined || out === undefined) {
    console.log(USAGE);
    process.exit(1);
  }

  const localBinary = process.env.HARDHAT_SLANG_BENCH_BINARY;
  if (localBinary !== undefined && localBinary !== "") {
    if (!existsSync(localBinary)) {
      throw new Error(
        `HARDHAT_SLANG_BENCH_BINARY points at ${localBinary}, which does not exist`,
      );
    }
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    copyFileSync(localBinary, out);
    chmodSync(out, 0o755);
    console.log(`Installed local slang ${localBinary} at ${out}`);
    return;
  }

  const assetUrl = `${RELEASES_BASE_URL}/download/${tag}/${getAssetName(assetSuffix)}`;
  await installVerifiedReleaseAsset(assetUrl, out);
  console.log(`Installed slang ${tag} at ${out}`);
}

await main();
