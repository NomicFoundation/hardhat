import { describe, it, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  ensurePublishedLocally,
  namesStaleOnNpm,
  promoteStaleDependents,
  raiseWorkspaceRanges,
  resolvePublishVersion,
  type Manifest,
  type PublishTarget,
} from "./publish.ts";

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

const UTILS = "@nomicfoundation/hardhat-utils";
const ERRORS = "@nomicfoundation/hardhat-errors";

/** A raise that crosses a major, next to one that stays inside it. */
const RAISED = new Map([
  [UTILS, { currentVersion: "4.4.0", version: "5.1.0" }],
  ["hardhat", { currentVersion: "3.20.0", version: "3.21.0" }],
]);

function manifest(sections: Partial<Manifest>): Manifest {
  return {
    name: "@nomicfoundation/hardhat-mocha",
    version: "4.1.0",
    ...sections,
  };
}

/**
 * pnpm publishes a workspace range as written, so a raise across a major has
 * to move the ranges it leaves behind. Cases cover each side of the range,
 * each form a workspace range takes, and what is left alone.
 */
describe("raiseWorkspaceRanges", () => {
  it("leaves a range the raised version still satisfies", () => {
    const input = manifest({ dependencies: { hardhat: "workspace:^3.12.0" } });

    const { manifest: result, raises } = raiseWorkspaceRanges(input, RAISED);

    assert.deepEqual(result, input);
    assert.deepEqual(raises, []);
  });

  it("raises a range the raised major left behind", () => {
    const input = manifest({ dependencies: { [UTILS]: "workspace:^4.4.0" } });

    const { manifest: result, raises } = raiseWorkspaceRanges(input, RAISED);

    assert.deepEqual(result.dependencies, { [UTILS]: "workspace:^5.1.0" });
    assert.deepEqual(raises, [
      {
        section: "dependencies",
        dependency: UTILS,
        from: "workspace:^4.4.0",
        to: "workspace:^5.1.0",
      },
    ]);
  });

  it("raises every section alike", () => {
    const ranges = { [UTILS]: "workspace:^4.4.0" };
    const input = manifest({
      dependencies: { ...ranges },
      devDependencies: { ...ranges },
      optionalDependencies: { ...ranges },
      peerDependencies: { ...ranges },
    });

    const { manifest: result, raises } = raiseWorkspaceRanges(input, RAISED);

    const raisedRanges = { [UTILS]: "workspace:^5.1.0" };
    assert.deepEqual(result.dependencies, raisedRanges);
    assert.deepEqual(result.devDependencies, raisedRanges);
    assert.deepEqual(result.optionalDependencies, raisedRanges);
    assert.deepEqual(result.peerDependencies, raisedRanges);
    assert.deepEqual(
      raises.map((raise) => raise.section),
      [
        "dependencies",
        "devDependencies",
        "optionalDependencies",
        "peerDependencies",
      ],
    );
  });

  it("raises a range left behind by a version published unchanged", () => {
    const sentinel = new Map([
      ["hardhat", { currentVersion: "4.0.1", version: "4.0.1" }],
    ]);
    const input = manifest({
      peerDependencies: { hardhat: "workspace:^3.20.0" },
    });

    const { manifest: result } = raiseWorkspaceRanges(input, sentinel);

    assert.deepEqual(result.peerDependencies, { hardhat: "workspace:^4.0.1" });
  });

  it("raises a bare range past a raised major", () => {
    const input = manifest({ devDependencies: { [UTILS]: "workspace:^" } });

    const { manifest: result } = raiseWorkspaceRanges(input, RAISED);

    assert.deepEqual(result.devDependencies, { [UTILS]: "workspace:^5.1.0" });
  });

  it("leaves a bare range within the raised major", () => {
    const input = manifest({ devDependencies: { hardhat: "workspace:^" } });

    const { manifest: result, raises } = raiseWorkspaceRanges(input, RAISED);

    assert.deepEqual(result, input);
    assert.deepEqual(raises, []);
  });

  it("leaves a range on a package that was not raised", () => {
    const input = manifest({ dependencies: { [ERRORS]: "workspace:^3.0.0" } });

    const { manifest: result, raises } = raiseWorkspaceRanges(input, RAISED);

    assert.deepEqual(result, input);
    assert.deepEqual(raises, []);
  });

  it("leaves a range that does not link the workspace", () => {
    const input = manifest({ dependencies: { [UTILS]: "^4.4.0" } });

    const { manifest: result, raises } = raiseWorkspaceRanges(input, RAISED);

    assert.deepEqual(result, input);
    assert.deepEqual(raises, []);
  });

  it("rejects a workspace form it cannot raise", () => {
    for (const range of [
      "workspace:*",
      "workspace:~4.4.0",
      "workspace:4.4.0",
    ]) {
      const input = manifest({ dependencies: { [UTILS]: range } });

      assert.throws(
        () => raiseWorkspaceRanges(input, RAISED),
        /only workspace:\^ ranges are supported/,
        range,
      );
    }
  });

  it("does not mutate its input", () => {
    const input = manifest({ dependencies: { [UTILS]: "workspace:^4.4.0" } });
    const before = structuredClone(input);

    raiseWorkspaceRanges(input, RAISED);

    assert.deepEqual(input, before);
  });
});

function target(
  name: string,
  currentVersion: string,
  action: PublishTarget["action"],
  version: string = currentVersion,
): PublishTarget {
  return {
    packageDir: `packages/${name.replace(/^@.*\//, "")}`,
    name,
    currentVersion,
    version,
    action,
    reason: "",
  };
}

/**
 * A consumer installs a package's dependencies, optional and peer ranges and
 * never its dev ranges, so only a move among the former outdates the release.
 */
describe("namesStaleOnNpm", () => {
  function rewriteWith(section: string) {
    const raise = {
      dependency: UTILS,
      from: "workspace:^4.4.0",
      to: "workspace:^5.1.0",
    };

    return raiseWorkspaceRanges(
      manifest({ [section]: { [UTILS]: raise.from } }),
      RAISED,
    );
  }

  it("names a package whose dependency range moved", () => {
    assert.deepEqual(
      namesStaleOnNpm([rewriteWith("dependencies")]),
      new Set(["@nomicfoundation/hardhat-mocha"]),
    );
  });

  it("names a package whose peer range moved", () => {
    assert.deepEqual(
      namesStaleOnNpm([rewriteWith("peerDependencies")]),
      new Set(["@nomicfoundation/hardhat-mocha"]),
    );
  });

  it("leaves out a package whose only moved range is a dev range", () => {
    assert.deepEqual(
      namesStaleOnNpm([rewriteWith("devDependencies")]),
      new Set(),
    );
  });
});

/**
 * A skipped package is served by npm, whose copy keeps the ranges from its
 * release. Cases cover the skip that has to be republished, the targets that
 * are not, and the range pass this promotion must not call for again.
 */
describe("promoteStaleDependents", () => {
  it("republishes a skipped dependent a minor above its release", () => {
    const hardhat = target("hardhat", "3.20.0", "skip");

    promoteStaleDependents([hardhat], new Set(["hardhat"]));

    assert.equal(hardhat.action, "publish");
    assert.equal(hardhat.version, "3.21.0");
  });

  it("leaves a publishing dependent at its own raise", () => {
    const hardhat = target("hardhat", "3.20.0", "publish", "3.22.0");

    promoteStaleDependents([hardhat], new Set(["hardhat"]));

    assert.equal(hardhat.version, "3.22.0");
  });

  it("leaves a skipped package whose ranges were not raised", () => {
    const hardhat = target("hardhat", "3.20.0", "skip");

    promoteStaleDependents([hardhat], new Set([UTILS]));

    assert.equal(hardhat.action, "skip");
    assert.equal(hardhat.version, "3.20.0");
  });

  it("refuses a 0.x package, whose minor bump leaves its own caret", () => {
    const early = target("@nomicfoundation/early", "0.1.3", "skip");

    assert.throws(
      () => promoteStaleDependents([early], new Set([early.name])),
      /Cannot republish @nomicfoundation\/early@0\.1\.3 as 0\.2\.0/,
    );
  });

  it("keeps a promoted version inside every range on it", () => {
    const hardhat = target("hardhat", "3.20.0", "skip");
    promoteStaleDependents([hardhat], new Set(["hardhat"]));

    const dependent = manifest({
      peerDependencies: { hardhat: "workspace:^3.12.0" },
    });
    const { raises } = raiseWorkspaceRanges(
      dependent,
      new Map([["hardhat", hardhat]]),
    );

    assert.deepEqual(raises, []);
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
