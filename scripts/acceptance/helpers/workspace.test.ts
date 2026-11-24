import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, beforeEach, describe, it } from "node:test";

import { clearScenarioDirectory, scenarioEnv } from "./workspace.ts";

describe("clearScenarioDirectory", () => {
  const dir = mkdtempSync(join(tmpdir(), "acceptance-workspace-"));

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("removes a project a previous run left above the cells, and its script", () => {
    mkdirSync(join(dir, "minimal", "npm"), { recursive: true });
    writeFileSync(join(dir, "minimal", "hardhat.config.ts"), "");
    writeFileSync(join(dir, "minimal.sh"), "");
    mkdirSync(join(dir, "other"));

    clearScenarioDirectory(dir, "minimal");

    assert.equal(existsSync(join(dir, "minimal")), false);
    assert.equal(existsSync(join(dir, "minimal.sh")), false);
    assert.equal(existsSync(join(dir, "other")), true);
  });

  it("is fine when there is nothing to clear", () => {
    clearScenarioDirectory(dir, "never-run");
  });
});

describe("scenarioEnv", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    process.env.npm_config_user_agent = "pnpm/12.18.0 npm/? node/v24 linux";
    process.env.NPM_CONFIG_REGISTRY = "https://registry.npmjs.org/";
    process.env.npm_execpath = "/usr/bin/pnpm";
    process.env.ACCEPTANCE_TEST_KEEP = "kept";
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it("drops the user agent, so the launcher picks the package manager", () => {
    assert.equal(scenarioEnv("/cache").npm_config_user_agent, undefined);
  });

  it("drops every inherited npm_ variable, in either case", () => {
    const env = scenarioEnv("/cache");

    assert.equal(env.NPM_CONFIG_REGISTRY, undefined);
    assert.equal(env.npm_execpath, undefined);
  });

  it("keeps the rest of the environment", () => {
    assert.equal(scenarioEnv("/cache").ACCEPTANCE_TEST_KEEP, "kept");
  });

  it("points every launcher at Verdaccio and at this run's caches", () => {
    const env = scenarioEnv("/cache");

    assert.match(env.npm_config_registry, /^http:\/\/127\.0\.0\.1:4873/);
    assert.equal(env.BUN_CONFIG_REGISTRY, env.npm_config_registry);
    assert.equal(env.npm_config_cache, "/cache/npm");
    assert.equal(env.pnpm_config_store_dir, "/cache/pnpm-store");
    assert.equal(env.BUN_INSTALL_CACHE_DIR, "/cache/bun");
  });
});
