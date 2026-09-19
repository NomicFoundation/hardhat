import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compareVersions,
  isRelease,
  minorBump,
  npmLatestVersion,
  parseCore,
  patchBump,
} from "./version.ts";

/**
 * `Number` coerces `01`, `1e3` and ` 1.2.3` to integers. Cases pin the
 * components that have to be rejected before parsing.
 */
describe("parseCore", () => {
  it("parses a release version", () => {
    assert.deepEqual(parseCore("3.17.0"), [3, 17, 0]);
  });

  it("drops a prerelease tag", () => {
    assert.deepEqual(parseCore("0.12.0-next.29"), [0, 12, 0]);
  });

  it("drops build metadata", () => {
    assert.deepEqual(parseCore("1.2.3+build.5"), [1, 2, 3]);
  });

  it("drops a prerelease tag carrying build metadata", () => {
    assert.deepEqual(parseCore("1.2.3-local.abc+build.5"), [1, 2, 3]);
  });

  it("rejects a version that is not major.minor.patch", () => {
    assert.throws(() => parseCore("3.17"), /Unparseable version: 3\.17/);
  });

  it("rejects a non-numeric component", () => {
    assert.throws(() => parseCore("3.x.0"), /Unparseable version: 3\.x\.0/);
  });

  it("rejects components Number would coerce", () => {
    for (const version of [
      "..",
      "1.2.",
      ".2.3",
      " 1.2.3",
      "1e3.2.3",
      "0x10.2.3",
    ]) {
      assert.throws(() => parseCore(version), /Unparseable version/, version);
    }
  });

  it("rejects leading zeroes, which semver forbids", () => {
    for (const version of ["01.2.3", "1.02.3", "1.2.03"]) {
      assert.throws(() => parseCore(version), /Unparseable version/, version);
    }
  });

  it("accepts a zero component", () => {
    assert.deepEqual(parseCore("0.12.0"), [0, 12, 0]);
  });
});

describe("compareVersions", () => {
  it("orders by major, then minor, then patch", () => {
    assert.ok(compareVersions("2.0.0", "1.9.9") > 0);
    assert.ok(compareVersions("1.9.0", "1.10.0") < 0);
    assert.ok(compareVersions("1.2.3", "1.2.4") < 0);
  });

  it("treats a prerelease as equal to its release", () => {
    assert.equal(compareVersions("3.17.0-local.abc", "3.17.0"), 0);
  });
});

describe("patchBump", () => {
  it("increments the patch component", () => {
    assert.equal(patchBump("3.17.0"), "3.17.1");
  });

  it("yields a release version from a prerelease", () => {
    assert.equal(patchBump("0.12.0-next.29"), "0.12.1");
  });
});

describe("isRelease", () => {
  it("accepts a plain release", () => {
    assert.equal(isRelease("3.17.0"), true);
  });

  it("accepts a release carrying build metadata", () => {
    assert.equal(isRelease("3.17.0+build.5"), true);
  });

  it("rejects a prerelease", () => {
    assert.equal(isRelease("3.18.0-next.1"), false);
  });
});

describe("minorBump", () => {
  it("increments the minor component and resets the patch", () => {
    assert.equal(minorBump("3.17.1"), "3.18.0");
  });

  it("yields a release version from a prerelease", () => {
    assert.equal(minorBump("0.12.0-next.29"), "0.13.0");
  });
});

/**
 * The floor is only as trustworthy as this lookup. Cases pin the registry it
 * queries, the status that means "never released", and which failures are
 * worth another attempt.
 */
describe("npmLatestVersion", () => {
  /** Mirrors `NPM_FETCH_ATTEMPTS`, which the module keeps private. */
  const ATTEMPTS = 6;

  function stubFetch(...outcomes: Array<Response | Error>) {
    const urls: string[] = [];
    const signals: Array<AbortSignal | undefined> = [];

    const fetch: typeof globalThis.fetch = async (url, init) => {
      urls.push(String(url));
      signals.push(init?.signal ?? undefined);

      const outcome = outcomes.shift();

      if (outcome === undefined) {
        throw new Error("stubFetch: no outcome left for this request");
      }

      if (outcome instanceof Error) {
        throw outcome;
      }

      return outcome;
    };

    return { fetch, urls, signals };
  }

  function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status });
  }

  it("queries the public registry, whatever npm is configured to use", async () => {
    const stub = stubFetch(json(200, { version: "3.17.0" }));

    const version = await npmLatestVersion("hardhat", { fetch: stub.fetch });

    assert.equal(version, "3.17.0");
    assert.deepEqual(stub.urls, ["https://registry.npmjs.org/hardhat/latest"]);
  });

  it("bounds each attempt with a timeout", async () => {
    const stub = stubFetch(json(200, { version: "3.17.0" }));

    await npmLatestVersion("hardhat", { fetch: stub.fetch });

    assert.ok(stub.signals[0] instanceof AbortSignal);
  });

  it("is undefined when the package has never been released", async () => {
    const stub = stubFetch(new Response(null, { status: 404 }));

    assert.equal(
      await npmLatestVersion("never-published", { fetch: stub.fetch }),
      undefined,
    );
  });

  it("retries a dropped connection and returns the later answer", async () => {
    const stub = stubFetch(
      new Error("fetch failed"),
      json(200, { version: "3.17.0" }),
    );

    const version = await npmLatestVersion("hardhat", {
      fetch: stub.fetch,
      retryDelayMs: 0,
    });

    assert.equal(version, "3.17.0");
    assert.equal(stub.urls.length, 2);
  });

  it("gives up on a persistent server error", async () => {
    const stub = stubFetch(...Array(ATTEMPTS).fill(json(503, {})));

    await assert.rejects(
      npmLatestVersion("hardhat", { fetch: stub.fetch, retryDelayMs: 0 }),
      /failed: 503/,
    );
    assert.equal(stub.urls.length, ATTEMPTS);
  });

  it("retries a status that reports a timeout rather than a refusal", async () => {
    const stub = stubFetch(json(408, {}), json(200, { version: "3.17.0" }));

    const version = await npmLatestVersion("hardhat", {
      fetch: stub.fetch,
      retryDelayMs: 0,
    });

    assert.equal(version, "3.17.0");
    assert.equal(stub.urls.length, 2);
  });

  it("does not retry a rejected request", async () => {
    const stub = stubFetch(json(403, {}));

    await assert.rejects(
      npmLatestVersion("hardhat", { fetch: stub.fetch, retryDelayMs: 0 }),
      /failed: 403/,
    );
    assert.equal(stub.urls.length, 1);
  });

  it("rejects a 200 without a version rather than reading it as absent", async () => {
    for (const body of [{}, { version: "" }, { version: 3 }]) {
      const stub = stubFetch(json(200, body));

      await assert.rejects(
        npmLatestVersion("hardhat", { fetch: stub.fetch }),
        /returned no version/,
        JSON.stringify(body),
      );
    }
  });
});
