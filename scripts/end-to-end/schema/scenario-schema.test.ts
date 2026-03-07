import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isScenarioDefinition } from "./scenario-schema.ts";

describe("isScenarioDefinition", () => {
  describe("clone tests", () => {
    it("accepts a minimal valid clone test", () => {
      const value = {
        type: "clone",
        repo: "OpenZeppelin/openzeppelin-contracts",
        commit: "abc123",
        packageManager: "npm",
        tags: ["solidity-compile"],
      };

      assert.equal(isScenarioDefinition(value), true);
    });

    it("accepts a clone test with all optional fields", () => {
      const value = {
        type: "clone",
        repo: "OpenZeppelin/openzeppelin-contracts",
        commit: "abc123",
        packageManager: "npm",
        preinstall: "./preinstall.sh",
        install: "./install.sh",
        commands: ["npx hardhat compile"],
        tags: ["solidity-compile"],
        env: { FOO: "bar" },
        submodules: true,
      };

      assert.equal(isScenarioDefinition(value), true);
    });

    it("rejects when type is missing", () => {
      assert.equal(
        isScenarioDefinition({
          repo: "org/repo",
          commit: "abc",
          packageManager: "npm",
          tags: [],
        }),
        false,
      );
    });

    it("rejects when repo is missing", () => {
      assert.equal(
        isScenarioDefinition({
          type: "clone",
          commit: "abc",
          packageManager: "npm",
          tags: [],
        }),
        false,
      );
    });

    it("rejects when packageManager is not 'npm'", () => {
      assert.equal(
        isScenarioDefinition({
          type: "clone",
          repo: "org/repo",
          commit: "abc",
          packageManager: "pnpm",
          tags: [],
        }),
        false,
      );
    });

    it("rejects when tags contains non-string", () => {
      assert.equal(
        isScenarioDefinition({
          type: "clone",
          repo: "org/repo",
          commit: "abc",
          packageManager: "npm",
          tags: [42],
        }),
        false,
      );
    });

    it("rejects when commands contains non-string", () => {
      assert.equal(
        isScenarioDefinition({
          type: "clone",
          repo: "org/repo",
          commit: "abc",
          packageManager: "npm",
          tags: [],
          commands: [42],
        }),
        false,
      );
    });

    it("rejects when env has non-string values", () => {
      assert.equal(
        isScenarioDefinition({
          type: "clone",
          repo: "org/repo",
          commit: "abc",
          packageManager: "npm",
          tags: [],
          env: { FOO: 123 },
        }),
        false,
      );
    });
  });

  it("rejects null", () => {
    assert.equal(isScenarioDefinition(null), false);
  });

  it("rejects unknown type", () => {
    assert.equal(isScenarioDefinition({ type: "unknown" }), false);
  });
});
