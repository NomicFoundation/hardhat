import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { useTmpDir } from "@nomicfoundation/hardhat-test-utils";

import {
  getDevDependenciesInstallationCommand,
  getPackageManager,
  installsPeerDependenciesByDefault,
} from "../../../../src/internal/cli/init/package-manager.js";

describe("getPackageManager", () => {
  useTmpDir("getPackageManager");

  let originalUserAgent: string | undefined;
  beforeEach(() => {
    originalUserAgent = process.env.npm_config_user_agent;
  });

  afterEach(() => {
    process.env.npm_config_user_agent = originalUserAgent;
  });

  const fixtureValues = [
    {
      agentString: "npm/11.6.1 node/v24.10.0 linux arm64 workspaces/false",
      expected: "npm",
    },
    {
      agentString: "npm/11.6.1 node/v24.10.0 linux arm64 workspaces/false",
      expected: "npm",
    },
    {
      agentString: "pnpm/10.18.3 npm/? node/v24.10.0 linux arm64",
      expected: "pnpm",
    },
    {
      agentString: "pnpm/10.18.3 npm/? node/v24.10.0 linux arm64",
      expected: "pnpm",
    },
    {
      agentString: "yarn/1.22.22 npm/? node/v24.10.0 linux arm64",
      expected: "yarn",
    },
    {
      agentString: "yarn/4.10.3 npm/? node/v24.10.0 linux arm64",
      expected: "yarn",
    },
    {
      agentString: "yarn/4.10.3 npm/? node/v24.10.0 linux arm64",
      expected: "yarn",
    },
    {
      agentString: "bun/1.3.1 npm/? node/v24.3.0 linux arm64",
      expected: "bun",
    },
    {
      agentString: "bun/1.3.1 npm/? node/v24.3.0 linux arm64",
      expected: "bun",
    },
    {
      agentString: "deno/2.5.6 npm/? deno/2.5.6 linux aarch64",
      expected: "deno",
    },
    {
      agentString: "deno/2.5.6 npm/? deno/2.5.6 linux aarch64",
      expected: "deno",
    },
  ];

  it("Should work for all the fixture values", () => {
    for (const fixture of fixtureValues) {
      process.env.npm_config_user_agent = fixture.agentString;

      assert.equal(
        getPackageManager(),
        fixture.expected,
        "Incorrect package manager for " + fixture.expected,
      );
    }
  });
});

describe("installsPeerDependenciesByDefault", () => {
  describe("for pnpm", () => {
    const tests = [
      {
        version: "7.0.0",
        autoInstallPeers: "true",
        expected: true,
      },
      {
        version: "7.0.0",
        autoInstallPeers: "false",
        expected: false,
      },
      {
        version: "7.0.0",
        autoInstallPeers: "undefined",
        expected: false,
      },
      {
        version: "8.0.0",
        autoInstallPeers: "true",
        expected: true,
      },
      {
        version: "8.0.0",
        autoInstallPeers: "false",
        expected: false,
      },
      {
        version: "8.0.0",
        autoInstallPeers: "undefined",
        expected: true,
      },
    ];
    for (const test of tests) {
      it(`should return ${test.expected} when using pnpm v${test.version} and auto-install-peers is ${test.autoInstallPeers}`, async () => {
        const actual = await installsPeerDependenciesByDefault(
          process.cwd(),
          "pnpm",
          test.version,
          { "auto-install-peers": test.autoInstallPeers },
        );
        assert.equal(actual, test.expected);
      });
    }
  });

  describe("for npm", () => {
    const tests = [
      {
        version: "6.0.0",
        legacyPeerDeps: "true",
        expected: false,
      },
      {
        version: "6.0.0",
        legacyPeerDeps: "false",
        expected: false,
      },
      {
        version: "6.0.0",
        legacyPeerDeps: "undefined",
        expected: false,
      },
      {
        version: "7.0.0",
        legacyPeerDeps: "true",
        expected: false,
      },
      {
        version: "7.0.0",
        legacyPeerDeps: "false",
        expected: true,
      },
      {
        version: "7.0.0",
        legacyPeerDeps: "undefined",
        expected: true,
      },
    ];
    for (const test of tests) {
      it(`should return ${test.expected} when using npm v${test.version} and legacy-peer-deps is ${test.legacyPeerDeps}`, async () => {
        const actual = await installsPeerDependenciesByDefault(
          process.cwd(),
          "npm",
          test.version,
          { "legacy-peer-deps": test.legacyPeerDeps },
        );
        assert.equal(actual, test.expected);
      });
    }
  });

  describe("for yarn", () => {
    it("should always return false", async () => {
      const actual = await installsPeerDependenciesByDefault(
        process.cwd(),
        "yarn",
      );
      assert.equal(actual, false);
    });
  });

  describe("for bun", () => {
    it("should always return true", async () => {
      const actual = await installsPeerDependenciesByDefault(
        process.cwd(),
        "bun",
      );
      assert.equal(actual, true);
    });
  });

  describe("for deno", () => {
    it("should always return false", async () => {
      const actual = await installsPeerDependenciesByDefault(
        process.cwd(),
        "deno",
      );
      assert.equal(actual, false);
    });
  });
});

describe("getDevDependenciesInstallationCommand", () => {
  it("should return the correct command for pnpm", async () => {
    const command = getDevDependenciesInstallationCommand("pnpm", ["a", "b"]);
    assert.equal(command.join(" "), 'pnpm add --save-dev "a" "b"');
  });

  it("should return the correct command for npm", async () => {
    const command = getDevDependenciesInstallationCommand("npm", ["a", "b"]);
    assert.equal(command.join(" "), 'npm install --save-dev "a" "b"');
  });

  it("should return the correct command for yarn", async () => {
    const command = getDevDependenciesInstallationCommand("yarn", ["a", "b"]);
    assert.equal(command.join(" "), 'yarn add --dev "a" "b"');
  });

  it("should return the correct command for bun", async () => {
    const command = getDevDependenciesInstallationCommand("bun", ["a", "b"]);
    assert.equal(command.join(" "), 'bun add --dev "a" "b"');
  });

  it("should return the correct command for deno", async () => {
    const command = getDevDependenciesInstallationCommand("deno", ["a", "b"]);
    assert.equal(command.join(" "), 'deno add "npm:a" "npm:b"');
  });
});
