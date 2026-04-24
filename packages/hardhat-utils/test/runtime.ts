import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { getRuntimeInfo } from "../src/runtime.js";

declare const globalThis: {
  Deno?: unknown;
};

const ORIGINAL_VERSIONS = process.versions;
const HAS_ORIGINAL_DENO = "Deno" in globalThis;
const ORIGINAL_DENO = globalThis.Deno;

function setProcessVersions(versions: Record<string, string>): void {
  Object.defineProperty(process, "versions", {
    value: versions,
    configurable: true,
    writable: true,
  });
}

function restoreProcessVersions(): void {
  Object.defineProperty(process, "versions", {
    value: ORIGINAL_VERSIONS,
    configurable: true,
    writable: true,
  });
}

function setDeno(deno: unknown): void {
  globalThis.Deno = deno;
}

function restoreDeno(): void {
  if (HAS_ORIGINAL_DENO) {
    globalThis.Deno = ORIGINAL_DENO;
  } else {
    delete globalThis.Deno;
  }
}

describe("runtime", () => {
  describe("getRuntimeInfo", () => {
    afterEach(() => {
      restoreProcessVersions();
      restoreDeno();
    });

    it("detects Node.js", () => {
      setProcessVersions({ node: "22.10.0" });
      assert.deepEqual(getRuntimeInfo(), {
        runtime: "node",
        version: "22.10.0",
      });
    });

    it("detects Bun even when process.versions.node is also defined", () => {
      setProcessVersions({ node: "22.10.0", bun: "1.1.0" });
      assert.deepEqual(getRuntimeInfo(), {
        runtime: "bun",
        version: "1.1.0",
      });
    });

    it("detects Deno", () => {
      setDeno({ version: { deno: "2.1.0" } });
      // Deno also emulates process.versions.node
      setProcessVersions({ node: "22.10.0" });
      assert.deepEqual(getRuntimeInfo(), {
        runtime: "deno",
        version: "2.1.0",
      });
    });

    it("returns undefined when no known runtime is detected", () => {
      setProcessVersions({});
      assert.equal(getRuntimeInfo(), undefined);
    });
  });
});
