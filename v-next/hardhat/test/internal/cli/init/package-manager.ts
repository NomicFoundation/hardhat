import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { useTmpDir } from "@nomicfoundation/hardhat-test-utils";
import { writeUtf8File } from "@nomicfoundation/hardhat-utils/fs";

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
    process.env.npm_config_user_agent = "npm"; // assume we are running npm by default
  });

  afterEach(() => {
    process.env.npm_config_user_agent = originalUserAgent;
  });

  it("should return pnpm if pnpm-lock.yaml exists", async () => {
    await writeUtf8File("pnpm-lock.yaml", "");
    assert.equal(await getPackageManager(process.cwd()), "pnpm");
  });

  it("should return pnpm if invoked from pnpx", async () => {
    assert.equal(await getPackageManager(process.cwd()), "npm");
    process.env.npm_config_user_agent =
      "pnpm/10.4.1 npm/? node/v23.2.0 linux x64";
    assert.equal(await getPackageManager(process.cwd()), "pnpm");
  });

  it("should return npm if package-lock.json exists", async () => {
    await writeUtf8File("package-lock.json", "");
    assert.equal(await getPackageManager(process.cwd()), "npm");
  });
  it("should return yarn if yarn.lock exists", async () => {
    await writeUtf8File("yarn.lock", "");
    assert.equal(await getPackageManager(process.cwd()), "yarn");
  });
  it("should return npm if no lock file exists", async () => {
    assert.equal(await getPackageManager(process.cwd()), "npm");
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
});
