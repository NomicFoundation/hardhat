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

const CACHE_DIR = path.join(os.homedir(), ".cache", "hardhat-solx-benchmark");

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

/**
 * Installs the release asset at `assetUrl` as an executable at `out`,
 * verified against the release's `<asset>.sha256` sidecar. Downloads are
 * cached under ~/.cache/hardhat-solx-benchmark by asset name and re-verified
 * on every use, so the per-scenario preinstalls don't re-fetch the same
 * binary.
 */
export async function installVerifiedReleaseAsset(
  assetUrl: string,
  out: string,
): Promise<void> {
  const assetName = path.basename(new URL(assetUrl).pathname);
  const cachedPath = path.join(CACHE_DIR, assetName);

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
}
