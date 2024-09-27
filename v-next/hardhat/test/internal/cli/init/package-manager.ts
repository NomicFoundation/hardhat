import { describe, it } from "node:test";

describe("getPackageManager", () => {
  it.todo("should return pnpm if pnpm-lock.yaml exists");
  it.todo("should return npm if package-lock.json exists");
  it.todo("should return yarn if yarn.lock exists");
  it.todo("should return npm if no lock file exists");
});

describe("installsPeerDependenciesByDefault", () => {
  describe("for pnpm", () => {
    const tests = [
      {
        version: 7,
        autoInstallPeers: true,
        expected: true,
      },
      {
        version: 7,
        autoInstallPeers: false,
        expected: false,
      },
      {
        version: 7,
        autoInstallPeers: undefined,
        expected: false,
      },
      {
        version: 8,
        autoInstallPeers: true,
        expected: true,
      },
      {
        version: 8,
        autoInstallPeers: "false",
        expected: false,
      },
      {
        version: 8,
        autoInstallPeers: "true",
        expected: true,
      },
    ];
    for (const test of tests) {
      it.todo(
        `should return ${test.expected} when using pnpm v${test.version} and auto-install-peers is ${test.autoInstallPeers}`,
      );
    }
  });

  describe("for npm", () => {
    const tests = [
      {
        version: 6,
        legacyPeerDeps: true,
        expected: false,
      },
      {
        version: 6,
        legacyPeerDeps: false,
        expected: false,
      },
      {
        version: 6,
        legacyPeerDeps: undefined,
        expected: false,
      },
      {
        version: 7,
        legacyPeerDeps: true,
        expected: false,
      },
      {
        version: 7,
        legacyPeerDeps: false,
        expected: true,
      },
      {
        version: 7,
        legacyPeerDeps: undefined,
        expected: true,
      },
    ];
    for (const test of tests) {
      it.todo(
        `should return ${test.expected} when using npm v${test.version} and legacy-peer-deps is ${test.legacyPeerDeps}`,
      );
    }
  });

  describe("for yarn", () => {
    it.todo("should always return false");
  });
});

describe("getDevDependenciesInstallationCommand", () => {
  it.todo("should return the correct command for pnpm");
  it.todo("should return the correct command for npm");
  it.todo("should return the correct command for yarn");
});
