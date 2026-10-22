import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VERDACCIO_URL } from "../../verdaccio/helpers/shell.ts";
import {
  buildPackageManagerEnv,
  getInstallArgs,
  getUpdateArgs,
  isYarnCacheEntryOf,
  removeInstalledCopies,
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

  it("lets the scenario env override the NODE_AUTH_TOKEN default", () => {
    const env = buildPackageManagerEnv(
      "yarn",
      { NODE_AUTH_TOKEN: "scenario" },
      { ...ciEnv, NODE_AUTH_TOKEN: "ambient" },
    );

    assert.equal(env.NODE_AUTH_TOKEN, "scenario");
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

describe("isYarnCacheEntryOf", () => {
  const names = ["hardhat", "@nomicfoundation/hardhat-slang"];

  it("matches a Berry cache zip of a listed package, at any version", () => {
    assert.ok(
      isYarnCacheEntryOf(
        "@nomicfoundation-hardhat-slang-npm-3.0.0-0fa5e312b7-10c0.zip",
        names,
      ),
    );
    assert.ok(
      isYarnCacheEntryOf("hardhat-npm-3.16.0-1d74c5c469-10c0.zip", names),
    );
  });

  it("does not match a package whose name only starts with a listed one", () => {
    assert.ok(
      !isYarnCacheEntryOf(
        "@nomicfoundation-hardhat-slang-solx-npm-3.0.4-fb65b954a0-10c0.zip",
        names,
      ),
    );
    assert.ok(
      !isYarnCacheEntryOf(
        "hardhat-deploy-npm-1.0.0-6f76b01394-10c0.zip",
        names,
      ),
    );
  });
});

describe("removeInstalledCopies", () => {
  const names = ["hardhat", "@nomicfoundation/hardhat-utils"];

  function makePackage(nodeModulesDir: string, name: string): string {
    const dir = path.join(nodeModulesDir, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "package.json"), "{}");
    return dir;
  }

  it("removes listed packages at the top level and nested, keeps the rest", () => {
    const nodeModules = path.join(
      mkdtempSync(path.join(tmpdir(), "remove-installed-copies-")),
      "node_modules",
    );
    const hardhat = makePackage(nodeModules, "hardhat");
    const utils = makePackage(nodeModules, "@nomicfoundation/hardhat-utils");
    const verify = makePackage(nodeModules, "@nomicfoundation/hardhat-verify");
    const nestedUtils = makePackage(
      path.join(verify, "node_modules"),
      "@nomicfoundation/hardhat-utils",
    );
    const sizer = makePackage(nodeModules, "hardhat-contract-sizer");
    const deeplyNestedHardhat = makePackage(
      path.join(sizer, "node_modules", "foo", "node_modules"),
      "hardhat",
    );

    assert.equal(removeInstalledCopies(nodeModules, names), 4);

    for (const removed of [hardhat, utils, nestedUtils, deeplyNestedHardhat]) {
      assert.ok(!existsSync(removed), removed);
    }
    assert.ok(existsSync(verify));
    assert.ok(existsSync(sizer));
  });

  it("does nothing without a node_modules directory", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "remove-installed-copies-"));

    assert.equal(
      removeInstalledCopies(path.join(dir, "node_modules"), names),
      0,
    );
  });
});
