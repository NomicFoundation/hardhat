import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { listPublishablePackageNames } from "./helpers/packages.ts";
import { fmt, log, logStep } from "./helpers/logging.ts";
import {
  ROOT_DIR,
  VERDACCIO_SERVER,
  VERDACCIO_CONFIG,
  VERDACCIO_DIR,
  VERDACCIO_HOST,
  VERDACCIO_HTPASSWD,
  VERDACCIO_LOG,
  VERDACCIO_NPMRC,
  VERDACCIO_PID_FILE,
  VERDACCIO_PORT,
  VERDACCIO_STORAGE,
  VERDACCIO_URL,
} from "./helpers/shell.ts";

export async function start(
  background: boolean,
  allowNpmVersionOverriding: boolean = false,
): Promise<void> {
  killExistingInstance();
  prepareVerdaccioDir();
  writeVerdaccioConfig(background, allowNpmVersionOverriding);
  writeAuthFiles();
  startVerdaccio(background);

  await waitForReady();

  printSetupSummary(background);
}

function killExistingInstance(): void {
  if (!existsSync(VERDACCIO_PID_FILE)) {
    return;
  }

  const pid = parseInt(readFileSync(VERDACCIO_PID_FILE, "utf-8").trim(), 10);

  if (isNaN(pid)) {
    log(fmt.deemphasize("Invalid PID file, removing"));

    rmSync(VERDACCIO_PID_FILE);

    return;
  }

  try {
    process.kill(pid, "SIGTERM");

    log(`Stopped existing instance ${fmt.deemphasize(`(PID ${pid})`)}`);
  } catch {
    log(fmt.deemphasize("No running instance found (stale PID file)"));
  }
}

function prepareVerdaccioDir(): void {
  if (existsSync(VERDACCIO_DIR)) {
    rmSync(VERDACCIO_DIR, { recursive: true });
  }

  mkdirSync(VERDACCIO_STORAGE, { recursive: true });
}

function writeVerdaccioConfig(
  background: boolean,
  allowNpmVersionOverriding: boolean,
): void {
  const logConfig = background
    ? `  type: file\n  path: ${VERDACCIO_LOG}\n  level: warn`
    : `  type: stdout\n  format: pretty\n  level: http`;

  const config = `storage: ${VERDACCIO_STORAGE}
auth:
  htpasswd:
    file: ${VERDACCIO_HTPASSWD}
    max_users: -1
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
packages:
${packageRules(allowNpmVersionOverriding)}max_body_size: 100mb
log:
${logConfig}
`;

  writeFileSync(VERDACCIO_CONFIG, config);
}

/**
 * The `packages:` section of the config.
 *
 * Verdaccio matches these blocks in order, so the exact package names written
 * first take precedence over the patterns below them.
 *
 * Normally every block proxies to npm, which means a package whose version
 * already exists there cannot be published locally: npm's copy is part of what
 * the registry serves.
 *
 * With `allowNpmVersionOverriding`, the packages this monorepo publishes each
 * get a block of their own with no `proxy`, so they are served from local
 * storage alone. The local build then wins whatever its version number, and
 * publishing over a version npm already has succeeds. Everything else -
 * including `@nomicfoundation/edr` and `@nomicfoundation/solidity-analyzer`,
 * which are built in other repos - still proxies to npm.
 *
 * The cost is that a package left unpublished 404s rather than quietly
 * resolving to its released version, which is the failure we want.
 */
function packageRules(allowNpmVersionOverriding: boolean): string {
  const block = (pattern: string, proxy: boolean) =>
    `  "${pattern}":
    access: $all
    publish: $authenticated
    unpublish: $authenticated
${proxy ? "    proxy: npmjs\n" : ""}`;

  const authoritative = allowNpmVersionOverriding
    ? listPublishablePackageNames()
    : [];

  // `hardhat` has a proxied block of its own, and becomes an authoritative one
  // when overriding. Emitting both would repeat the key, which Verdaccio
  // rejects as an invalid config rather than resolving one way or the other.
  const proxied = ["@nomicfoundation/*", "hardhat", "**"].filter(
    (pattern) => !authoritative.includes(pattern),
  );

  return [
    ...authoritative.map((name) => block(name, false)),
    ...proxied.map((pattern) => block(pattern, true)),
  ].join("");
}

function writeAuthFiles(): void {
  // Pre-seed htpasswd with a known user so verdaccio accepts publishes
  // without any interactive login. Format: username:{SHA}base64(sha1(password))
  const passwordHash =
    "{SHA}" + createHash("sha1").update("test").digest("base64");

  writeFileSync(VERDACCIO_HTPASSWD, `test:${passwordHash}\n`);

  // Write .npmrc with basic auth (base64 of "test:test") scoped to the registry
  const basicAuth = Buffer.from("test:test").toString("base64");

  writeFileSync(
    VERDACCIO_NPMRC,
    `//${VERDACCIO_HOST}:${VERDACCIO_PORT}/:_auth=${basicAuth}\n`,
  );
}

function startVerdaccio(background: boolean): void {
  logStep("Starting Verdaccio");

  const serverArgs = [
    VERDACCIO_SERVER,
    VERDACCIO_CONFIG,
    VERDACCIO_HOST,
    String(VERDACCIO_PORT),
  ];

  if (background) {
    const logFd = openSync(VERDACCIO_LOG, "a");

    const child = spawn(process.execPath, serverArgs, {
      detached: true,
      stdio: ["ignore", logFd, logFd],
      cwd: ROOT_DIR,
    });

    child.unref();
    closeSync(logFd);

    if (child.pid === undefined) {
      throw new Error("Failed to start Verdaccio (no PID returned)");
    }

    writeFileSync(VERDACCIO_PID_FILE, String(child.pid));

    log(
      `Started on ${fmt.version(VERDACCIO_URL)} ${fmt.deemphasize(`(PID ${child.pid})`)}`,
    );
  } else {
    const child = spawn(process.execPath, serverArgs, {
      stdio: "inherit",
      cwd: ROOT_DIR,
    });

    if (child.pid === undefined) {
      throw new Error("Failed to start Verdaccio (no PID returned)");
    }

    writeFileSync(VERDACCIO_PID_FILE, String(child.pid));

    const cleanup = () => {
      if (existsSync(VERDACCIO_PID_FILE)) {
        rmSync(VERDACCIO_PID_FILE);
      }
    };

    const shutdown = () => {
      cleanup();

      process.exit(0);
    };

    child.on("exit", cleanup);

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    log(
      `Started on ${fmt.version(VERDACCIO_URL)} ${fmt.deemphasize(`(PID ${child.pid})`)}`,
    );
  }
}

async function waitForReady(
  timeoutMs: number = 30_000,
  intervalMs: number = 500,
): Promise<void> {
  log("Waiting for Verdaccio to be ready...");

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${VERDACCIO_URL}/-/ping`);

      if (response.ok) {
        log(fmt.success("Verdaccio is ready"));

        return;
      }
    } catch {
      // Server not yet accepting connections
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `Verdaccio did not become ready within ${timeoutMs / 1000}s.\n` +
      `Check ${VERDACCIO_LOG} for details.`,
  );
}

function printSetupSummary(background: boolean): void {
  logStep("Setup complete");
  log(`Registry:   ${fmt.version(VERDACCIO_URL)}`);
  log(`PID file:   ${fmt.deemphasize(VERDACCIO_PID_FILE)}`);
  log(`Server log: ${fmt.deemphasize(VERDACCIO_LOG)}`);
  log(`Storage:    ${fmt.deemphasize(VERDACCIO_STORAGE)}`);
  log("");
  log("To install packages from this registry in an external repo:");
  log(`  npm install --registry ${VERDACCIO_URL}`);
  log("");

  if (background) {
    log("To stop the registry:");
    log("  pnpm verdaccio stop");
  } else {
    log("Verdaccio is running in the foreground. Press Ctrl+C to stop.");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
