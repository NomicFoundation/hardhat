import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

const USAGE = `
scripts/benchmark/download-solx.ts — Provision a pinned solx release binary

DESCRIPTION
  Downloads the solx release binary for --version from GitHub releases,
  verifies it against the release's .sha256 sidecar, and installs it at --out
  (executable). Scenario preinstall scripts use this to provision solx
  versions other than the one the hardhat-solx plugin ships, wiring them into
  build profiles via the plugin's \`path\` compiler option.

  Downloads are cached under ~/.cache/hardhat-solx-benchmark (re-verified on
  every use), so the per-scenario preinstalls don't re-fetch the same binary.

OPTIONS
  --version <v>   Required. solx release version (e.g. 0.1.5)
  --out <path>    Required. Where to install the binary

EXAMPLE
  node scripts/benchmark/download-solx.ts --version 0.1.5 --out ./.solx/solx-v0.1.5
`;

const RELEASES_BASE_URL = "https://github.com/matter-labs/solx/releases";

/**
 * Mirrors the release asset naming in hardhat-solx's platform.ts. Windows is
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

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`);
  }
  return response;
}

async function fetchExpectedSha256(url: string): Promise<string> {
  const body = await (await fetchOk(url)).text();
  // Sidecar format: "<hex digest>  <filename>"
  const digest = body.trim().split(/\s+/)[0];
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error(`Malformed sha256 sidecar at ${url}: "${body.trim()}"`);
  }
  return digest;
}

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
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
  const cachedPath = path.join(
    os.homedir(),
    ".cache",
    "hardhat-solx-benchmark",
    assetName,
  );

  const expectedSha256 = await fetchExpectedSha256(`${assetUrl}.sha256`);

  if (existsSync(cachedPath) && sha256(cachedPath) === expectedSha256) {
    console.log(`Using cached ${assetName} from ${cachedPath}`);
  } else {
    console.log(`Downloading ${assetUrl}`);
    const body = await (await fetchOk(assetUrl)).arrayBuffer();
    mkdirSync(path.dirname(cachedPath), { recursive: true });
    writeFileSync(cachedPath, Buffer.from(body));

    const actual = sha256(cachedPath);
    if (actual !== expectedSha256) {
      rmSync(cachedPath);
      throw new Error(
        `sha256 mismatch for ${assetName}: expected ${expectedSha256}, got ${actual}`,
      );
    }
  }

  mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  copyFileSync(cachedPath, out);
  chmodSync(out, 0o755);
  console.log(`Installed solx ${version} at ${out}`);
}

await main();
