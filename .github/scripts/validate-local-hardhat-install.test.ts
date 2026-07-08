// Unit tests for validate-local-hardhat-install.ts.
//
// Run with Node's built-in test runner (no extra dependencies):
//   node --test .github/scripts/validate-local-hardhat-install.test.ts

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";

import {
  classifyScenario,
  resolveInstalledHardhat,
  resolveScenario,
  yarnLockHardhatVersions,
  type ScenarioResolution,
} from "./validate-local-hardhat-install.ts";

const EXPECTED = { version: "3.9.2", preVersion: "3.9.1", stamp: "run-1" };

// Narrow a resolution to its error variant, failing the test otherwise.
function errorOf(resolution: ScenarioResolution): string {
  assert.ok("error" in resolution, "expected an error resolution");
  return resolution.error;
}

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

test("PnP scenario is OK only when yarn.lock locks hardhat at the version", () => {
  const ok = classifyScenario(
    "scenario",
    { pnpLockedVersions: ["3.9.2"] },
    EXPECTED,
  );
  assert.equal(ok.ok, true);
  assert.match(ok.message, /PnP lockfile/);

  const stale = classifyScenario(
    "scenario",
    { pnpLockedVersions: ["3.9.1"] },
    EXPECTED,
  );
  assert.equal(stale.ok, false);
  assert.match(stale.message, /locks hardhat@3\.9\.1, expected 3\.9\.2/);

  const missing = classifyScenario(
    "scenario",
    { pnpLockedVersions: [] },
    EXPECTED,
  );
  assert.equal(missing.ok, false);
  assert.match(missing.message, /<no entry>/);
});

test("yarnLockHardhatVersions only matches the scenario's own hardhat entry", () => {
  // Yarn Berry format. The unrelated package and the hardhat-prefixed plugin
  // carry the expected version and must not count (the false positive the
  // whole-file `.includes` check used to have), and neither does a hardhat
  // pulled in transitively under a dependent's own `hardhat@npm:*` range.
  const berry = [
    '"@nomicfoundation/edr@npm:3.9.2":',
    "  version: 3.9.2",
    "",
    '"hardhat-gas-reporter@npm:3.9.2":',
    "  version: 3.9.2",
    "",
    '"hardhat@npm:*":',
    "  version: 3.9.2",
    "",
    '"hardhat@npm:^3.0.0, hardhat@npm:3.9.1":',
    "  version: 3.9.1",
    '  resolution: "hardhat@npm:3.9.1"',
    "",
  ].join("\n");
  // Multi-descriptor entries match on any of their descriptors.
  assert.deepEqual(yarnLockHardhatVersions(berry, "3.9.1"), ["3.9.1"]);
  assert.deepEqual(yarnLockHardhatVersions(berry, "^3.0.0"), ["3.9.1"]);
  assert.deepEqual(yarnLockHardhatVersions(berry, "*"), ["3.9.2"]);
  assert.deepEqual(yarnLockHardhatVersions(berry, "^2.0.0"), []);

  // Yarn classic format descriptors carry no `npm:` protocol.
  const classic = ["hardhat@^3.0.0:", '  version "3.9.1"', ""].join("\n");
  assert.deepEqual(yarnLockHardhatVersions(classic, "^3.0.0"), ["3.9.1"]);

  assert.deepEqual(yarnLockHardhatVersions("", "3.9.1"), []);
});

// Build a fake installed scenario: node_modules/hardhat with a nested main
// (like hardhat's real ./dist/src/index.js) to exercise the walk-up.
function makeScenario(pkg: Record<string, unknown>): string {
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

test("resolveInstalledHardhat reads version and stamp from the installed manifest", (t: TestContext) => {
  const dir = makeScenario({ version: "3.9.2", benchRunStamp: "run-1" });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  assert.deepEqual(resolveInstalledHardhat(dir), {
    version: "3.9.2",
    stamp: "run-1",
  });
});

test("resolveScenario reports an error for a dir without hardhat", (t: TestContext) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-local-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  assert.match(errorOf(resolveScenario(dir)), /Cannot find module 'hardhat'/);
});

test("resolveScenario falls back to the yarn.lock for PnP scenarios", (t: TestContext) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-local-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, ".pnp.cjs"), "");
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ dependencies: { hardhat: "3.9.2" } }),
  );
  fs.writeFileSync(
    path.join(dir, "yarn.lock"),
    [
      '"hardhat@npm:*":',
      "  version: 3.9.9",
      "",
      '"hardhat@npm:3.9.2":',
      "  version: 3.9.2",
      "",
    ].join("\n"),
  );

  // Only the entry for the scenario's own hardhat dependency counts.
  assert.deepEqual(resolveScenario(dir), { pnpLockedVersions: ["3.9.2"] });
});

test("resolveScenario errors for a PnP scenario without a direct hardhat dependency", (t: TestContext) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-local-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, ".pnp.cjs"), "");
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({}));
  fs.writeFileSync(
    path.join(dir, "yarn.lock"),
    '"hardhat@npm:3.9.2":\n  version: 3.9.2\n',
  );

  assert.match(errorOf(resolveScenario(dir)), /declares no hardhat dependency/);
});

test("resolveScenario reports the underlying error for an unreadable PnP package.json", (t: TestContext) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-local-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, ".pnp.cjs"), "");
  fs.writeFileSync(path.join(dir, "yarn.lock"), "");

  const missing = errorOf(resolveScenario(dir));
  assert.match(missing, /could not read the PnP scenario's package.json/);
  assert.match(missing, /ENOENT/);

  fs.writeFileSync(path.join(dir, "package.json"), "{ not json");
  const malformed = errorOf(resolveScenario(dir));
  assert.match(malformed, /could not read the PnP scenario's package.json/);
  assert.match(malformed, /JSON/);
});
