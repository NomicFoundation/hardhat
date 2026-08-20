// Guards the pin manifest (pinned-tool-versions.sh) against half-edits.
// The pinned versions are also baked into names the manifest cannot feed:
// the "solx-0.1.7" profile names and .solx/solx-v0.1.7 path in
// solx-profiles.ts, the scenario.json benchmark cell names, and
// render-solx-tables.ts's CELL_NOTES keys. Workflows and the report
// renderer refer to those names, so a version bump must rename them in
// lockstep. This test fails on any file left behind.
//
// The test also asserts the solx pin agrees with three other channels that
// name the same binary: the plugin's SOLIDITY_TO_SOLX_VERSION_MAP, the
// regression workflow's replay --solx-version flag, and the plugin README's
// documented version. As a cross-check, readShippedSolxVersion
// (render-solx-tables.ts) — the extractor that labels the shipped column in
// real reports — must still read the map's value.
//
// The token scan flags every solx-vX.Y.Z / solx-X.Y.Z / forge-X.Y.Z it
// sees. Prose mentioning a historical version must therefore write it bare
// ("0.1.4"), never as a name ("solx-0.1.4").
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { readShippedSolxVersion } from "./render-solx-tables.ts";
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
 * Every file of every solx scenario. Scenario dirs are found by their
 * hardhat.config.solx.ts marker, not by name: openzeppelin-contracts-0.34
 * is a solx scenario without the -solx suffix.
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
    assert.ok(
      `solx-${solxPin}` in profiles,
      `buildSolxProfiles emits no "solx-${solxPin}" profile for the pinned ` +
        `version ${solxPin} — align scripts/benchmark/solx-profiles.ts with ` +
        `SOLX_PINNED_VERSION in scripts/benchmark/pinned-tool-versions.sh`,
    );
    assert.ok(
      `solx-${solxPin}-via-ir` in profiles,
      `buildSolxProfiles emits no "solx-${solxPin}-via-ir" profile for the ` +
        `pinned version ${solxPin} — align scripts/benchmark/solx-profiles.ts ` +
        `with SOLX_PINNED_VERSION in scripts/benchmark/pinned-tool-versions.sh`,
    );
  });

  it("agrees with the plugin's version map, the workflow's replay pin and the plugin README", () => {
    // Three other channels name the same binary. The plain "solx" profiles
    // (the standard-JSON dump step, gas-compare) resolve through the
    // plugin's SOLIDITY_TO_SOLX_VERSION_MAP. The regression workflow's
    // replay step pins that binary with --solx-version. The plugin README
    // documents the mapped version to users. All four channels (this
    // manifest included) must name one solx version, or the benchmark
    // compares mismatched compilers and the docs misreport both.
    // Regex over the sources, not an import: constants.ts pulls in hardhat
    // types that scripts/tsconfig.json typechecks without the plugin's
    // type-extensions (see readShippedSolxVersion).
    const mapFile = "packages/hardhat-solx/src/internal/constants.ts";
    const manifestFile = "scripts/benchmark/pinned-tool-versions.sh";
    const workflowFile = ".github/workflows/solx-regression-benchmark.yml";
    const readmeFile = "packages/hardhat-solx/README.md";
    const alignmentHint =
      `— align SOLIDITY_TO_SOLX_VERSION_MAP in ${mapFile}, ` +
      `SOLX_PINNED_VERSION in ${manifestFile}, the --solx-version flag ` +
      `in ${workflowFile}, and the "Currently supported" line in ` +
      `${readmeFile}`;

    const constants = readFileSync(path.join(repoRoot, mapFile), "utf8");
    const mapLiteral = /SOLIDITY_TO_SOLX_VERSION_MAP[^{]*\{([^}]*)\}/.exec(
      constants,
    );
    assert.notEqual(
      mapLiteral,
      null,
      `SOLIDITY_TO_SOLX_VERSION_MAP not found in ${mapFile} — update this ` +
        `test's extraction to wherever the plugin's solx version moved`,
    );
    // Retired entries may survive as `//`-commented lines inside the
    // literal. Drop them so a mismatch is never attributed to a comment.
    const mapBody = mapLiteral![1]
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n");
    const mapEntries = [
      ...mapBody.matchAll(/"([\d.]+)":\s*"(\d+\.\d+\.\d+)"/g),
    ];
    assert.ok(
      mapEntries.length > 0,
      `no entries parsed from SOLIDITY_TO_SOLX_VERSION_MAP in ${mapFile}`,
    );
    for (const [, solidityVersion, solxVersion] of mapEntries) {
      assert.equal(
        solxVersion,
        solxPin,
        `the plugin maps Solidity ${solidityVersion} to solx ${solxVersion} ` +
          `but SOLX_PINNED_VERSION is ${solxPin} ${alignmentHint}`,
      );
    }
    // The report renderer labels the shipped column with its own extraction
    // of the same map. Make sure it still reads the value this test just
    // validated.
    assert.equal(
      readShippedSolxVersion(repoRoot),
      solxPin,
      `readShippedSolxVersion (render-solx-tables.ts) no longer reads the ` +
        `pinned version out of ${mapFile}`,
    );

    const workflow = readFileSync(path.join(repoRoot, workflowFile), "utf8");
    const replayPins = [
      ...workflow.matchAll(/--solx-version[ =](\d+\.\d+\.\d+)/g),
    ];
    assert.ok(
      replayPins.length > 0,
      `no --solx-version flag found in ${workflowFile} — if the replay step ` +
        `no longer pins a version, retire this assertion with it; if the ` +
        `flag no longer carries an inline literal version (e.g. it now ` +
        `takes a shell variable), update this extraction to follow it`,
    );
    for (const [, v] of replayPins) {
      assert.equal(
        v,
        solxPin,
        `the replay step pins --solx-version ${v} but SOLX_PINNED_VERSION ` +
          `is ${solxPin} ${alignmentHint}`,
      );
    }

    // The plugin README documents the mapped version to users. It drifted
    // once (0.1.6 while the pinned cells measured 0.1.7), so it is part of
    // the lockstep too.
    const readme = readFileSync(path.join(repoRoot, readmeFile), "utf8");
    const readmeVersions = [
      ...readme.matchAll(
        /Currently supported: `[\d.]+` \(solx (\d+\.\d+\.\d+)\)/g,
      ),
    ];
    assert.ok(
      readmeVersions.length > 0,
      `no "Currently supported: \`<solidity>\` (solx <version>)" line found ` +
        `in ${readmeFile} — if the wording changed, update this test's ` +
        `extraction to follow it`,
    );
    for (const [, v] of readmeVersions) {
      assert.equal(
        v,
        solxPin,
        `${readmeFile} documents solx ${v} but SOLX_PINNED_VERSION is ` +
          `${solxPin} ${alignmentHint}`,
      );
    }
  });

  it("matches every pinned-version token in the scenario dirs, factory, renderer and workflow", () => {
    const files = [
      path.join(repoRoot, "scripts/benchmark/solx-profiles.ts"),
      path.join(repoRoot, "scripts/benchmark/render-solx-tables.ts"),
      // The regression workflow's comments name pinned cells (e.g. the
      // replay step's "cold compile solx-<pin>" pairing). Its prose writes
      // historical versions bare, so the name tokens are scannable.
      path.join(repoRoot, ".github/workflows/solx-regression-benchmark.yml"),
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
