import os from "node:os";

import { installVerifiedReleaseAsset } from "./helpers/release-download.ts";

const USAGE = `
scripts/benchmark/download-solx.ts — Provision a pinned solx release binary

DESCRIPTION
  Downloads the solx release binary for --version from GitHub releases,
  verifies it against the release's .sha256 sidecar, and installs it at --out
  (executable). Scenario preinstall scripts use this to provision solx
  versions other than the one the hardhat-slang-solx plugin ships, wiring
  them into
  build profiles via the plugin's \`path\` compiler option.

  Downloads are cached under ~/.cache/hardhat-solx-benchmark (re-verified on
  every use), so the per-scenario preinstalls don't re-fetch the same binary.

OPTIONS
  --version <v>   Required. solx release version (e.g. 0.1.7)
  --out <path>    Required. Where to install the binary

EXAMPLE
  node scripts/benchmark/download-solx.ts --version 0.1.7 --out ./.solx/solx-v0.1.7
`;

const RELEASES_BASE_URL = "https://github.com/matter-labs/solx/releases";

/**
 * Mirrors the release asset naming in hardhat-slang-solx's platform.ts.
 * Windows is
 * deliberately unsupported: the benchmark only runs on Linux/macOS.
 */
function getAssetName(version: string): string {
  const platform = os.platform();
  const arch = os.arch();

  if (platform === "linux" && arch === "x64") {
    return `solx-linux-amd64-gnu-v${version}`;
  }
  if (platform === "linux" && arch === "arm64") {
    return `solx-linux-arm64-gnu-v${version}`;
  }
  if (platform === "darwin") {
    return `solx-macosx-v${version}`;
  }
  throw new Error(`No solx release asset for ${platform}/${arch}`);
}

async function main(): Promise<void> {
  const getArg = (flag: string): string | undefined => {
    const i = process.argv.indexOf(flag);
    return i !== -1 && i + 1 < process.argv.length
      ? process.argv[i + 1]
      : undefined;
  };

  const version = getArg("--version");
  const out = getArg("--out");
  if (version === undefined || out === undefined) {
    console.log(USAGE);
    process.exit(1);
  }

  const assetName = getAssetName(version);
  const assetUrl = `${RELEASES_BASE_URL}/download/${version}/${assetName}`;
  await installVerifiedReleaseAsset(assetUrl, out);

  console.log(`Installed solx ${version} at ${out}`);
}

await main();
