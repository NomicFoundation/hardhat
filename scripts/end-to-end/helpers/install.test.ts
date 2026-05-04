import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getInstallArgs } from "./install.ts";

const REGISTRY = "http://127.0.0.1:4873";

describe("getInstallArgs", () => {
  describe("yarn", () => {
    it("omits --registry (env var carries it) when lockfile updates are not allowed", () => {
      assert.deepEqual(getInstallArgs("yarn", false, REGISTRY), ["install"]);
    });

    it("appends --no-immutable when lockfile updates are allowed", () => {
      assert.deepEqual(getInstallArgs("yarn", true, REGISTRY), [
        "install",
        "--no-immutable",
      ]);
    });
  });

  describe("npm", () => {
    it("passes --registry when lockfile updates are not allowed", () => {
      assert.deepEqual(getInstallArgs("npm", false, REGISTRY), [
        "install",
        `--registry=${REGISTRY}`,
      ]);
    });

    it("does not append a lockfile flag (npm install never freezes)", () => {
      assert.deepEqual(getInstallArgs("npm", true, REGISTRY), [
        "install",
        `--registry=${REGISTRY}`,
      ]);
    });
  });

  describe("pnpm", () => {
    it("passes --registry when lockfile updates are not allowed", () => {
      assert.deepEqual(getInstallArgs("pnpm", false, REGISTRY), [
        "install",
        `--registry=${REGISTRY}`,
      ]);
    });

    it("appends --no-frozen-lockfile when lockfile updates are allowed", () => {
      assert.deepEqual(getInstallArgs("pnpm", true, REGISTRY), [
        "install",
        `--registry=${REGISTRY}`,
        "--no-frozen-lockfile",
      ]);
    });
  });

  describe("bun", () => {
    it("passes --registry when lockfile updates are not allowed", () => {
      assert.deepEqual(getInstallArgs("bun", false, REGISTRY), [
        "install",
        `--registry=${REGISTRY}`,
      ]);
    });

    it("appends --no-frozen-lockfile when lockfile updates are allowed", () => {
      assert.deepEqual(getInstallArgs("bun", true, REGISTRY), [
        "install",
        `--registry=${REGISTRY}`,
        "--no-frozen-lockfile",
      ]);
    });
  });
});
