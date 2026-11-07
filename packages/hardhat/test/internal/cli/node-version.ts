import assert from "node:assert/strict";
import { describe, it, afterEach, beforeEach } from "node:test";

import {
  exitIfNodeVersionNotSupported,
  getMinSupportedNodeVersion,
  isNodeVersionSupported,
} from "../../../src/internal/cli/node-version.js";

let originalNodeVersion: string;

function setNodeVersion(version: string) {
  Object.defineProperty(process.versions, "node", {
    value: version,
    writable: false, // Read-only, as the original
    configurable: true, // Allows us to restore later
  });
}

beforeEach(() => {
  originalNodeVersion = process.versions.node;
});

afterEach(() => {
  setNodeVersion(originalNodeVersion);
});

describe("Node version", () => {
  describe("getMinSupportedNodeVersion", () => {
    it("returns the minimum version of majors that have their own", () => {
      assert.deepEqual(getMinSupportedNodeVersion(22), [22, 18, 0]);
      assert.deepEqual(getMinSupportedNodeVersion(24), [24, 3, 0]);
    });

    it("returns the lowest minimum version for any other major", () => {
      assert.deepEqual(getMinSupportedNodeVersion(20), [22, 18, 0]);
      assert.deepEqual(getMinSupportedNodeVersion(23), [22, 18, 0]);
      assert.deepEqual(getMinSupportedNodeVersion(26), [22, 18, 0]);
    });
  });

  describe("isNodeVersionSupported", () => {
    it("is true for supported versions", () => {
      for (const version of [
        "22.18.0",
        "22.18.1",
        "22.23.3",
        "24.3.0",
        "24.22.0",
        "26.0.0",
      ]) {
        setNodeVersion(version);
        assert(isNodeVersionSupported(), `${version} should be supported`);
      }
    });

    it("is true for majors above the lowest one without their own minimum version", () => {
      for (const version of ["23.0.0", "25.0.0", "27.0.0"]) {
        setNodeVersion(version);
        assert(isNodeVersionSupported(), `${version} should be supported`);
      }
    });

    it("is false for unsupported versions", () => {
      for (const version of [
        "20.19.0",
        "21.7.3",
        "22.13.0",
        "22.17.1",
        "24.0.0",
        "24.2.0",
      ]) {
        setNodeVersion(version);
        assert(!isNodeVersionSupported(), `${version} should not be supported`);
      }
    });

    it("returns true in case it's not parsable", async () => {
      setNodeVersion("non-parseable");
      assert(
        isNodeVersionSupported(),
        `${process.versions.node} should be supported`,
      );
    });
  });

  describe("exitIfNodeVersionNotSupported", () => {
    for (const [unsupported, minVersion] of [
      ["24.2.0", "24.3.0"],
      ["22.17.0", "22.18.0"],
      ["20.0.0", "22.18.0"],
    ]) {
      it(`writes an error to stderr and calls process.exit(1) on ${unsupported}`, (t) => {
        setNodeVersion(unsupported);

        const writeMock = t.mock.method(process.stderr, "write", () => true);
        const exitMock = t.mock.method(process, "exit", () => undefined);

        exitIfNodeVersionNotSupported();

        assert.equal(
          exitMock.mock.callCount(),
          1,
          "process.exit should be called exactly once",
        );
        assert.deepEqual(
          exitMock.mock.calls[0].arguments,
          [1],
          "process.exit should be called with code 1",
        );
        assert.equal(
          writeMock.mock.callCount(),
          1,
          "process.stderr.write should be called exactly once",
        );

        const writtenMessage = String(writeMock.mock.calls[0].arguments[0]);
        assert.ok(
          writtenMessage.includes(unsupported),
          `stderr message should include the current version (${unsupported}): ${writtenMessage}`,
        );
        assert.ok(
          writtenMessage.includes(`Please upgrade to Node.js ${minVersion}`),
          `stderr message should include the minimum version (${minVersion}): ${writtenMessage}`,
        );
      });
    }

    it("does nothing when the version is supported", (t) => {
      setNodeVersion("22.18.0");

      const writeMock = t.mock.method(process.stderr, "write", () => true);
      const exitMock = t.mock.method(process, "exit", () => undefined);

      exitIfNodeVersionNotSupported();

      assert.equal(
        exitMock.mock.callCount(),
        0,
        "process.exit should not be called",
      );
      assert.equal(
        writeMock.mock.callCount(),
        0,
        "process.stderr.write should not be called",
      );
    });

    it("does nothing on Bun even when the emulated node version would be unsupported", (t) => {
      t.after(() => {
        Object.defineProperty(process.versions, "bun", {
          value: undefined,
          configurable: true,
        });
      });

      setNodeVersion("22.17.0");
      Object.defineProperty(process.versions, "bun", {
        value: "1.1.0",
        writable: false,
        configurable: true,
      });

      const writeMock = t.mock.method(process.stderr, "write", () => true);
      const exitMock = t.mock.method(process, "exit", () => undefined);

      exitIfNodeVersionNotSupported();

      assert.equal(
        exitMock.mock.callCount(),
        0,
        "process.exit should not be called on Bun",
      );
      assert.equal(
        writeMock.mock.callCount(),
        0,
        "process.stderr.write should not be called on Bun",
      );
    });
  });
});
