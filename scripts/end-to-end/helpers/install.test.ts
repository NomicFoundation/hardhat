import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VERDACCIO_URL } from "../../verdaccio/helpers/shell.ts";
import {
  buildPackageManagerEnv,
  getInstallArgs,
  getUpdateArgs,
} from "./install.ts";

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

describe("buildPackageManagerEnv", () => {
  // The CI shape that broke every yarn-Classic scenario: setup-node's
  // user-level .npmrc names a token this job never has.
  const ciEnv = {
    PATH: "/usr/bin",
    NPM_CONFIG_USERCONFIG: "/tmp/runner/.npmrc",
    npm_config_userconfig: "/tmp/runner/.npmrc",
  };

  it("drops the user-level npm config both cases spell", () => {
    const env = buildPackageManagerEnv("yarn", undefined, ciEnv);

    assert.equal("NPM_CONFIG_USERCONFIG" in env, false);
    assert.equal("npm_config_userconfig" in env, false);
    assert.equal(env.PATH, "/usr/bin");
  });

  it("defines NODE_AUTH_TOKEN so a repo's own .npmrc can expand it", () => {
    assert.equal(
      buildPackageManagerEnv("yarn", undefined, ciEnv).NODE_AUTH_TOKEN,
      "",
    );
  });

  it("keeps a real NODE_AUTH_TOKEN when the caller has one", () => {
    const env = buildPackageManagerEnv("yarn", undefined, {
      ...ciEnv,
      NODE_AUTH_TOKEN: "real",
    });

    assert.equal(env.NODE_AUTH_TOKEN, "real");
  });

  it("points yarn and npm at Verdaccio, pnpm at its own settings", () => {
    const yarnEnv = buildPackageManagerEnv("yarn", undefined, ciEnv);
    const pnpmEnv = buildPackageManagerEnv("pnpm", undefined, ciEnv);

    assert.equal(yarnEnv.npm_config_registry, VERDACCIO_URL);
    assert.equal(yarnEnv.npm_config_minimum_release_age, "0");
    assert.equal(pnpmEnv.pnpm_config_trust_lockfile, "true");
    assert.equal(pnpmEnv.npm_config_registry, undefined);
  });

  it("lets scenario env through", () => {
    const env = buildPackageManagerEnv(
      "yarn",
      { SKIP_LINT_SOLIDITY: "1" },
      ciEnv,
    );

    assert.equal(env.SKIP_LINT_SOLIDITY, "1");
  });
});
