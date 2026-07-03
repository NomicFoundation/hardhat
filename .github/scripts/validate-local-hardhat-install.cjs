// Validate that the E2E benchmark scenarios installed the hardhat build
// published to Verdaccio by this workflow run, identified by the unique stamp
// embedded in packages/hardhat/package.json before the benchmark. Locally
// republished versions are deterministic, so the version string alone can't
// distinguish this run's tarball from a stale one served out of a
// package-manager cache on the self-hosted runner; the stamp can.
//
// Diagnostic only: emits GitHub warning annotations and always exits 0, so it
// can never regress the benchmark runner.
//
// Inputs (environment):
//   BENCH_RUN_STAMP  the stamp embedded before the benchmark
//   HH_PRE_VER       packages/hardhat version before the benchmark ran; if it
//                    still equals the post-run version, hardhat had no changes
//                    since its release and was not republished, so scenarios
//                    legitimately resolve the (unstamped) registry release
//   E2E_CLONE_DIR    scenario clone dir (default: /tmp/end-to-end)
//
// Run the tests with:
//   node --test .github/scripts/validate-local-hardhat-install.test.cjs

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const DEFAULT_CLONE_DIR = "/tmp/end-to-end";

// Resolve the hardhat that a scenario's install loads. Works across
// npm/pnpm/yarn node_modules layouts (Node realpaths pnpm symlinks).
// require.resolve("hardhat/package.json") is blocked by the exports map, so
// resolve the "." export and walk up to the owning package.json.
function resolveInstalledHardhat(scenarioDir) {
  const scenarioRequire = createRequire(path.join(scenarioDir, "noop.js"));
  const main = scenarioRequire.resolve("hardhat");

  let dir = path.dirname(main);
  for (;;) {
    const candidate = path.join(dir, "package.json");
    if (fs.existsSync(candidate)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(candidate, "utf8"));
        if (pkg.name === "hardhat") {
          return { version: pkg.version, stamp: pkg.benchRunStamp };
        }
      } catch {}
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`package.json for hardhat not found above ${main}`);
    }
    dir = parent;
  }
}

// Resolve a scenario into one of:
//   { version, stamp } — the installed hardhat's manifest fields
//   { pnpLockfileHasVersion } — yarn Plug'n'Play scenario (no node_modules to
//                               resolve through); true if yarn.lock mentions
//                               the expected version
//   { error }
function resolveScenario(scenarioDir, expectedVersion) {
  try {
    return resolveInstalledHardhat(scenarioDir);
  } catch (e) {
    const isPnp =
      fs.existsSync(path.join(scenarioDir, ".pnp.cjs")) ||
      fs.existsSync(path.join(scenarioDir, ".pnp.loader.mjs"));
    const lockfile = path.join(scenarioDir, "yarn.lock");
    if (isPnp && fs.existsSync(lockfile)) {
      return {
        pnpLockfileHasVersion: fs
          .readFileSync(lockfile, "utf8")
          .includes(expectedVersion),
      };
    }
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// Decide the outcome for one scenario. `expected` holds:
//   version     the locally published hardhat version (post-benchmark)
//   preVersion  the packages/hardhat version before the benchmark ran
//   stamp       this run's unique stamp
function classifyScenario(id, resolution, expected) {
  if (resolution.error !== undefined) {
    return {
      ok: false,
      message: `${id}: could not resolve the scenario's hardhat (${resolution.error})`,
    };
  }

  if (resolution.pnpLockfileHasVersion !== undefined) {
    return resolution.pnpLockfileHasVersion
      ? { ok: true, message: `OK (PnP lockfile, stamp unverifiable): ${id}` }
      : {
          ok: false,
          message: `${id}: PnP scenario's yarn.lock does not mention hardhat@${expected.version}`,
        };
  }

  if (resolution.version !== expected.version) {
    return {
      ok: false,
      message: `${id}: resolves hardhat@${resolution.version}, expected the locally published ${expected.version}`,
    };
  }

  if (resolution.stamp !== undefined) {
    if (resolution.stamp === expected.stamp) {
      return {
        ok: true,
        message: `OK: ${id} -> hardhat@${resolution.version} (stamp ${resolution.stamp})`,
      };
    }
  } else if (expected.version === expected.preVersion) {
    // Hardhat wasn't republished this run, so the unstamped registry release
    // is the correct resolution
    return {
      ok: true,
      message: `OK (registry release, hardhat unchanged since ${expected.version}): ${id}`,
    };
  }

  return {
    ok: false,
    message:
      `${id}: hardhat@${resolution.version} carries stamp ` +
      `'${resolution.stamp ?? "<none>"}', expected '${expected.stamp}' — ` +
      `stale content from a package-manager cache`,
  };
}

function warn(message) {
  // GitHub annotations render only the first line; collapse for readability.
  console.log(`::warning::${message.replace(/\r?\n/g, " ")}`);
}

function main() {
  const stamp = process.env.BENCH_RUN_STAMP;
  const preVersion = process.env.HH_PRE_VER;
  if (stamp === undefined || preVersion === undefined) {
    warn(
      "BENCH_RUN_STAMP/HH_PRE_VER not set (stamp step missing?) — " +
        "skipping local-install validation",
    );
    return;
  }

  // sinceReleasePublish bumps packages/hardhat/package.json in place, so
  // after the benchmark it holds the version that was published to Verdaccio.
  const hardhatPkgJson = path.resolve(
    __dirname,
    "../../packages/hardhat/package.json",
  );
  const version = JSON.parse(fs.readFileSync(hardhatPkgJson, "utf8")).version;
  const expected = { version, preVersion, stamp };

  const cloneDir = process.env.E2E_CLONE_DIR ?? DEFAULT_CLONE_DIR;
  console.log(
    `Expecting hardhat@${version} with stamp '${stamp}' (clones in ${cloneDir})`,
  );

  const scenarioDirs = fs.existsSync(cloneDir)
    ? fs
        .readdirSync(cloneDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(cloneDir, entry.name))
    : [];

  if (scenarioDirs.length === 0) {
    warn(
      `No scenario clones found under ${cloneDir} — could not validate ` +
        `that the local hardhat build was used`,
    );
    return;
  }

  let allOk = true;
  for (const scenarioDir of scenarioDirs) {
    const id = path.basename(scenarioDir);
    const resolution = resolveScenario(scenarioDir, expected.version);
    const verdict = classifyScenario(id, resolution, expected);
    if (verdict.ok) {
      console.log(verdict.message);
    } else {
      warn(verdict.message);
      allOk = false;
    }
  }

  if (allOk) {
    console.log(`All scenarios resolve the expected hardhat (${version}).`);
  }
}

module.exports = { classifyScenario, resolveInstalledHardhat, resolveScenario };

if (require.main === module) {
  main();
}
