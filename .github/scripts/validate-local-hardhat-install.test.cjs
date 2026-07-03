// Unit tests for validate-local-hardhat-install.cjs.
//
// Run with Node's built-in test runner (no extra dependencies):
//   node --test .github/scripts/validate-local-hardhat-install.test.cjs

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  classifyScenario,
  resolveInstalledHardhat,
  resolveScenario,
} = require("./validate-local-hardhat-install.cjs");

const EXPECTED = { version: "3.9.2", preVersion: "3.9.1", stamp: "run-1" };

test("fresh install carrying this run's stamp is OK", () => {
  const verdict = classifyScenario(
    "scenario",
    { version: "3.9.2", stamp: "run-1" },
    EXPECTED,
  );
  assert.equal(verdict.ok, true);
  assert.match(verdict.message, /stamp run-1/);
});

test("stale stamp after a republish warns", () => {
  const verdict = classifyScenario(
    "scenario",
    { version: "3.9.2", stamp: "run-0" },
    EXPECTED,
  );
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /stale content/);
});

test("missing stamp after a republish warns", () => {
  const verdict = classifyScenario(
    "scenario",
    { version: "3.9.2", stamp: undefined },
    EXPECTED,
  );
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /'<none>'/);
});

test("unstamped registry release is OK when hardhat was not republished", () => {
  const verdict = classifyScenario(
    "scenario",
    { version: "3.9.1", stamp: undefined },
    { version: "3.9.1", preVersion: "3.9.1", stamp: "run-1" },
  );
  assert.equal(verdict.ok, true);
  assert.match(verdict.message, /registry release/);
});

test("a prior run's stamp warns even when hardhat was not republished", () => {
  // A defined stamp proves a locally published tarball; the registry-release
  // allowance must not mask it.
  const verdict = classifyScenario(
    "scenario",
    { version: "3.9.1", stamp: "run-0" },
    { version: "3.9.1", preVersion: "3.9.1", stamp: "run-1" },
  );
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /stale content/);
});

test("version mismatch warns", () => {
  const verdict = classifyScenario(
    "scenario",
    { version: "3.9.0", stamp: "run-1" },
    EXPECTED,
  );
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /expected the locally published 3\.9\.2/);
});

test("unresolvable scenario warns", () => {
  const verdict = classifyScenario(
    "scenario",
    { error: "Cannot find module 'hardhat'" },
    EXPECTED,
  );
  assert.equal(verdict.ok, false);
  assert.match(verdict.message, /could not resolve/);
});

test("PnP scenario is OK only when yarn.lock mentions the version", () => {
  const ok = classifyScenario(
    "scenario",
    { pnpLockfileHasVersion: true },
    EXPECTED,
  );
  assert.equal(ok.ok, true);
  assert.match(ok.message, /PnP lockfile/);

  const stale = classifyScenario(
    "scenario",
    { pnpLockfileHasVersion: false },
    EXPECTED,
  );
  assert.equal(stale.ok, false);
});

// Build a fake installed scenario: node_modules/hardhat with a nested main
// (like hardhat's real ./dist/src/index.js) to exercise the walk-up.
function makeScenario(pkg) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-local-"));
  const hardhatDir = path.join(dir, "node_modules", "hardhat");
  fs.mkdirSync(path.join(hardhatDir, "dist", "src"), { recursive: true });
  fs.writeFileSync(
    path.join(hardhatDir, "package.json"),
    JSON.stringify({ name: "hardhat", main: "./dist/src/index.js", ...pkg }),
  );
  fs.writeFileSync(path.join(hardhatDir, "dist", "src", "index.js"), "");
  return dir;
}

test("resolveInstalledHardhat reads version and stamp from the installed manifest", (t) => {
  const dir = makeScenario({ version: "3.9.2", benchRunStamp: "run-1" });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  assert.deepEqual(resolveInstalledHardhat(dir), {
    version: "3.9.2",
    stamp: "run-1",
  });
});

test("resolveScenario reports an error for a dir without hardhat", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-local-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const resolution = resolveScenario(dir, "3.9.2");
  assert.match(resolution.error, /Cannot find module 'hardhat'/);
});

test("resolveScenario falls back to the yarn.lock for PnP scenarios", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-local-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, ".pnp.cjs"), "");
  fs.writeFileSync(path.join(dir, "yarn.lock"), 'version: "3.9.2"\n');

  assert.deepEqual(resolveScenario(dir, "3.9.2"), {
    pnpLockfileHasVersion: true,
  });
  assert.deepEqual(resolveScenario(dir, "3.9.3"), {
    pnpLockfileHasVersion: false,
  });
});
