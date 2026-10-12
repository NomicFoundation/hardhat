import { describe, it, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ensurePublishedLocally, resolvePublishVersion } from "./publish.ts";

/**
 * npm's latest is the only ceiling, since it is what Verdaccio's uplink serves.
 * Cases cover each side of it and the package npm has never seen.
 *
 * Three rules shape the rest. Skipping publishes nothing, so npm has to serve
 * that exact release. A release tag only says whether the code changed, which
 * is unknowable without one. Every result is a release version, because
 * node-semver drops prereleases from the ranges plugins declare.
 */
describe("resolvePublishVersion", () => {
  it("publishes as-is when the package was never released", () => {
    assert.equal(
      resolvePublishVersion("0.1.0", undefined, undefined, false),
      "0.1.0",
    );
  });

  it("publishes a version an earlier run wrote that npm later released", () => {
    assert.equal(
      resolvePublishVersion("3.19.0", "3.17.0", "3.19.0", false),
      "3.20.0",
    );
  });

  it("skips when the release is this exact code", () => {
    assert.equal(
      resolvePublishVersion("3.3.0", "3.3.0", "3.3.0", false),
      undefined,
    );
  });

  it("bumps past the release when code changed since it", () => {
    assert.equal(
      resolvePublishVersion("3.3.0", "3.3.0", "3.3.0", true),
      "3.4.0",
    );
  });

  it("publishes as-is when already ahead of tag and npm", () => {
    assert.equal(
      resolvePublishVersion("3.3.1", "3.3.0", "3.3.0", false),
      "3.3.1",
    );
  });

  it("publishes as-is when already ahead, even with further changes", () => {
    assert.equal(
      resolvePublishVersion("3.3.1", "3.3.0", "3.3.0", true),
      "3.3.1",
    );
  });

  it("bumps past the release when the checkout lags it", () => {
    assert.equal(
      resolvePublishVersion("3.16.0", "3.17.0", "3.17.0", false),
      "3.18.0",
    );
  });

  it("bumps past npm when only npm is ahead", () => {
    assert.equal(
      resolvePublishVersion("3.16.0", "3.16.0", "3.17.0", false),
      "3.18.0",
    );
  });

  it("publishes as-is when the package is not on npm at all", () => {
    assert.equal(
      resolvePublishVersion("3.3.0", "3.3.0", undefined, true),
      "3.3.0",
    );
  });

  it("normalizes a prerelease that npm has never seen", () => {
    assert.equal(
      resolvePublishVersion("3.3.0-next.1", "3.3.0", undefined, false),
      "3.3.1",
    );
  });

  it("bumps past npm when the package has no release tag", () => {
    assert.equal(
      resolvePublishVersion("3.3.0", undefined, "3.4.0", false),
      "3.5.0",
    );
  });

  it("publishes a tagless checkout that matches npm", () => {
    assert.equal(
      resolvePublishVersion("3.17.0", undefined, "3.17.0", false),
      "3.18.0",
    );
  });

  it("bumps past npm when it is ahead of an already-bumped checkout", () => {
    assert.equal(
      resolvePublishVersion("3.17.0", "3.16.0", "3.18.0", false),
      "3.19.0",
    );
  });

  it("bumps past a matching ceiling that npm alone sets", () => {
    assert.equal(
      resolvePublishVersion("3.17.0", "3.16.0", "3.17.0", true),
      "3.18.0",
    );
  });

  it("turns a prerelease that is already ahead into a release", () => {
    assert.equal(
      resolvePublishVersion("3.18.0-next.1", "3.17.0", "3.17.0", false),
      "3.18.1",
    );
  });

  it("publishes a prerelease rather than skipping it", () => {
    assert.equal(
      resolvePublishVersion(
        "3.18.0-next.1",
        "3.18.0-next.1",
        "3.18.0-next.1",
        false,
      ),
      "3.19.0",
    );
  });

  it("publishes as-is when the tag matches but npm lags it", () => {
    assert.equal(
      resolvePublishVersion("3.17.0", "3.17.0", "3.16.0", false),
      "3.17.0",
    );
  });

  it("publishes as-is when the package has a tag but no npm release", () => {
    assert.equal(
      resolvePublishVersion("3.17.0", "3.17.0", undefined, false),
      "3.17.0",
    );
  });
});

/**
 * pnpm exits 0 on a version it believes is already published, so a silent skip
 * has to be told apart from a real local publish.
 */
describe("ensurePublishedLocally", () => {
  const HARDHAT = { name: "hardhat", version: "3.18.0" };
  const MOCHA = { name: "@nomicfoundation/hardhat-mocha", version: "3.2.0" };

  function storageWith(t: TestContext, ...tarballs: string[]): string {
    const dir = mkdtempSync(join(tmpdir(), "verdaccio-storage-"));

    t.after(() => rmSync(dir, { recursive: true, force: true }));

    for (const tarball of tarballs) {
      const path = join(dir, tarball);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, "");
    }

    return dir;
  }

  it("accepts a target whose tarball Verdaccio stored", (t) => {
    ensurePublishedLocally(
      [HARDHAT],
      storageWith(t, "hardhat/hardhat-3.18.0.tgz"),
    );
  });

  it("accepts a scoped target, whose tarball name drops the scope", (t) => {
    ensurePublishedLocally(
      [MOCHA],
      storageWith(t, "@nomicfoundation/hardhat-mocha/hardhat-mocha-3.2.0.tgz"),
    );
  });

  it("rejects a target Verdaccio never stored", (t) => {
    assert.throws(
      () => ensurePublishedLocally([HARDHAT], storageWith(t)),
      /pnpm did not publish these/,
    );
  });

  it("rejects a target stored only at another version", (t) => {
    assert.throws(
      () =>
        ensurePublishedLocally(
          [HARDHAT],
          storageWith(t, "hardhat/hardhat-3.17.0.tgz"),
        ),
      /hardhat@3\.18\.0/,
    );
  });

  it("names every missing target", (t) => {
    assert.throws(
      () => ensurePublishedLocally([HARDHAT, MOCHA], storageWith(t)),
      /hardhat@3\.18\.0[\s\S]*hardhat-mocha@3\.2\.0/,
    );
  });
});
