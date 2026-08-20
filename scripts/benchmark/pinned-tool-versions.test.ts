// Guards the pin manifest (pinned-tool-versions.sh) against half-edits: the
// pinned versions are also baked into names the manifest cannot feed — the
// "solx-0.1.7" profile names and .solx/solx-v0.1.7 path in solx-profiles.ts,
// the scenario.json benchmark cell names, and render-solx-tables.ts's
// CELL_NOTES keys — because workflows and the report renderer refer to those
// names. A version bump must rename them in lockstep; this test fails on any
// file left behind.
//
// The token scan flags every solx-vX.Y.Z / solx-X.Y.Z / forge-X.Y.Z it sees,
// so prose mentioning a historical version must write it bare ("0.1.4"),
// never as a name ("solx-0.1.4").
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { buildSolxProfiles } from "./solx-profiles.ts";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");

function readPin(name: string): string {
  const manifest = readFileSync(
    path.join(repoRoot, "scripts/benchmark/pinned-tool-versions.sh"),
    "utf8",
  );
  const match = new RegExp(`^${name}="(\\d+\\.\\d+\\.\\d+)"$`, "m").exec(
    manifest,
  );
  assert.notEqual(match, null, `${name} not found in pinned-tool-versions.sh`);
  return match![1];
}

const solxPin = readPin("SOLX_PINNED_VERSION");
const forgePin = readPin("FORGE_PINNED_VERSION");

/**
 * Every file of every solx scenario — the dirs are found by their
 * hardhat.config.solx.ts marker, not by name (openzeppelin-contracts-0.34 is
 * a solx scenario without the -solx suffix).
 */
function solxScenarioFiles(): string[] {
  const e2eDir = path.join(repoRoot, "end-to-end");
  const files: string[] = [];
  for (const dir of readdirSync(e2eDir)) {
    const scenarioDir = path.join(e2eDir, dir);
    if (!existsSync(path.join(scenarioDir, "hardhat.config.solx.ts"))) {
      continue;
    }
    for (const entry of readdirSync(scenarioDir, { withFileTypes: true })) {
      if (entry.isFile()) {
        files.push(path.join(scenarioDir, entry.name));
      }
    }
  }
  return files;
}

describe("pinned-tool-versions", () => {
  it("the factory emits the pinned solx profiles", () => {
    // The token scan below can't notice the pinned profiles disappearing
    // entirely, so assert their presence functionally.
    const profiles = buildSolxProfiles({ baseSettings: {} });
    assert.ok(`solx-${solxPin}` in profiles);
    assert.ok(`solx-${solxPin}-via-ir` in profiles);
  });

  it("matches every pinned-version token in the scenario dirs, factory and renderer", () => {
    const files = [
      path.join(repoRoot, "scripts/benchmark/solx-profiles.ts"),
      path.join(repoRoot, "scripts/benchmark/render-solx-tables.ts"),
      ...solxScenarioFiles(),
    ];
    assert.ok(files.length > 2, "no solx scenario files found");

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      for (const [, v] of content.matchAll(/solx-v?(\d+\.\d+\.\d+)/g)) {
        assert.equal(v, solxPin, `stale solx pin ${v} in ${file}`);
      }
      for (const [, v] of content.matchAll(/forge-(\d+\.\d+\.\d+)/g)) {
        assert.equal(v, forgePin, `stale forge pin ${v} in ${file}`);
      }
    }
  });

  it("keeps download versions out of the preinstall scripts", () => {
    // Preinstalls must take versions from the sourced manifest, not repeat
    // them as literal --version arguments.
    for (const file of solxScenarioFiles()) {
      if (!file.endsWith("preinstall.sh")) {
        continue;
      }
      const content = readFileSync(file, "utf8");
      assert.doesNotMatch(
        content,
        /--version\s+\d/,
        `hardcoded download version in ${file}`,
      );
    }
  });
});
