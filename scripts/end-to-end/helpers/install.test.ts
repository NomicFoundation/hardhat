import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getInstallArgs, getUpdateArgs } from "./install.ts";

const REGISTRY = "http://127.0.0.1:4873";

describe("getInstallArgs", () => {
  it("omits --registry for yarn (it rejects the CLI flag)", () => {
    assert.deepEqual(getInstallArgs("yarn", REGISTRY), ["install"]);
  });

  it("passes --registry for npm", () => {
    assert.deepEqual(getInstallArgs("npm", REGISTRY), [
      "install",
      `--registry=${REGISTRY}`,
    ]);
  });

  it("passes --registry for pnpm", () => {
    assert.deepEqual(getInstallArgs("pnpm", REGISTRY), [
      "install",
      `--registry=${REGISTRY}`,
    ]);
  });

  it("passes --registry for bun", () => {
    assert.deepEqual(getInstallArgs("bun", REGISTRY), [
      "install",
      `--registry=${REGISTRY}`,
    ]);
  });
});

describe("getUpdateArgs", () => {
  const specs = ["hardhat@3.9.1", "@nomicfoundation/hardhat-ethers@4.0.14"];

  it("uses `pnpm update <specs>`", () => {
    assert.deepEqual(getUpdateArgs("pnpm", specs, REGISTRY), [
      "update",
      ...specs,
      `--registry=${REGISTRY}`,
    ]);
  });

  it("uses `npm install <specs>`", () => {
    assert.deepEqual(getUpdateArgs("npm", specs, REGISTRY), [
      "install",
      ...specs,
      `--registry=${REGISTRY}`,
    ]);
  });

  it("uses `bun add <specs>`", () => {
    assert.deepEqual(getUpdateArgs("bun", specs, REGISTRY), [
      "add",
      ...specs,
      `--registry=${REGISTRY}`,
    ]);
  });

  it("uses `yarn add <specs>` (registry comes from config, not a flag)", () => {
    assert.deepEqual(getUpdateArgs("yarn", specs, REGISTRY), ["add", ...specs]);
  });
});
