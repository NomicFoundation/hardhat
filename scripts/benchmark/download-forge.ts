import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

const USAGE = `
scripts/benchmark/download-forge.ts — Provision a pinned forge release binary

DESCRIPTION
  Downloads the foundry release tarball for --version from GitHub releases,
  verifies it against the release's .sha256 sidecar, and installs the forge
  binary it contains at --out (executable; the other foundry tools are not
  extracted). Scenario preinstall scripts use this to provision the pinned
  forge for the cross-tool parity cells.

  Downloads are cached under ~/.cache/hardhat-solx-benchmark (re-verified on
  every use), so the per-scenario preinstalls don't re-fetch the same tarball.

OPTIONS
  --version <v>   Required. foundry release version, without the v (e.g. 1.7.1)
  --out <path>    Required. Where to install the forge binary

EXAMPLE
  node scripts/benchmark/download-forge.ts --version 1.7.1 --out ./.foundry/forge
`;

const RELEASES_BASE_URL = "https://github.com/foundry-rs/foundry/releases";

// foundry_v1.7.1_linux_amd64.tar.gz etc. Windows is deliberately unsupported:
// the benchmark only runs on Linux/macOS.
function getAssetName(version: string): string {
  const platform = os.platform();
  const arch = os.arch();

  const platformPart =
    platform === "linux"
      ? "linux"
      : platform === "darwin"
        ? "darwin"
        : undefined;
  const archPart =
    arch === "x64" ? "amd64" : arch === "arm64" ? "arm64" : undefined;
  if (platformPart === undefined || archPart === undefined) {
    throw new Error(`No foundry release asset for ${platform}/${arch}`);
  }
  return `foundry_v${version}_${platformPart}_${archPart}`;
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
  const tarballName = `${assetName}.tar.gz`;
  const cachedPath = path.join(
    os.homedir(),
    ".cache",
    "hardhat-solx-benchmark",
    tarballName,
  );

  const expectedSha256 = await fetchExpectedSha256(
    `${RELEASES_BASE_URL}/download/v${version}/${assetName}.sha256`,
  );

  if (existsSync(cachedPath) && sha256(cachedPath) === expectedSha256) {
    console.log(`Using cached ${tarballName} from ${cachedPath}`);
  } else {
    const assetUrl = `${RELEASES_BASE_URL}/download/v${version}/${tarballName}`;
    console.log(`Downloading ${assetUrl}`);
    const body = await (await fetchOk(assetUrl)).arrayBuffer();
    mkdirSync(path.dirname(cachedPath), { recursive: true });
    writeFileSync(cachedPath, Buffer.from(body));

    const actual = sha256(cachedPath);
    if (actual !== expectedSha256) {
      rmSync(cachedPath);
      throw new Error(
        `sha256 mismatch for ${tarballName}: expected ${expectedSha256}, got ${actual}`,
      );
    }
  }

  const extractDir = mkdtempSync(path.join(os.tmpdir(), "forge-extract-"));
  try {
    execFileSync("tar", ["-xzf", cachedPath, "-C", extractDir, "forge"]);
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    copyFileSync(path.join(extractDir, "forge"), out);
    chmodSync(out, 0o755);
  } finally {
    rmSync(extractDir, { recursive: true, force: true });
  }
  console.log(`Installed forge ${version} at ${out}`);
}

await main();
