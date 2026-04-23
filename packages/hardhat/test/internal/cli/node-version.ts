import assert from "node:assert/strict";
import { describe, it, afterEach, beforeEach } from "node:test";

import {
  exitIfNodeVersionNotSupported,
  isNodeVersionSupported,
  MIN_SUPPORTED_NODE_VERSION,
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
  describe("isNodeVersionSupported", () => {
    it("is true when current node version is greater than supported version", () => {
      const [major, minor, patch] = MIN_SUPPORTED_NODE_VERSION;

      setNodeVersion(`${major + 2}.${minor - 1}.${patch - 1}`);
      assert(
        isNodeVersionSupported(),
        `${process.versions.node} should be supported`,
      );

      setNodeVersion(`${major}.${minor + 1}.${patch - 1}`);
      assert(
        isNodeVersionSupported(),
        `${process.versions.node} should be supported`,
      );

      setNodeVersion(`${major}.${minor}.${patch + 1}`);
      assert(
        isNodeVersionSupported(),
        `${process.versions.node} should be supported`,
      );
    });

    it("is true when the current version is the same as the supported version", () => {
      const [major, minor, patch] = MIN_SUPPORTED_NODE_VERSION;

      setNodeVersion(`${major}.${minor}.${patch}`);
      assert(
        isNodeVersionSupported(),
        `${process.versions.node} should be supported`,
      );
    });

    it("is false when the current version is less than the supported version", () => {
      const [major, minor, patch] = MIN_SUPPORTED_NODE_VERSION;

      setNodeVersion(`${major - 2}.${minor + 1}.${patch + 1}`);
      assert(
        !isNodeVersionSupported(),
        `${process.versions.node} should not be supported`,
      );

      setNodeVersion(`${major}.${minor - 1}.${patch + 1}`);
      assert(
        !isNodeVersionSupported(),
        `${process.versions.node} should not be supported`,
      );

      setNodeVersion(`${major}.${minor}.${patch - 1}`);
      assert(
        !isNodeVersionSupported(),
        `${process.versions.node} should not be supported`,
      );
    });

    it("returns true in case it's not parsable", async () => {
      setNodeVersion("non-parseable");
      assert(
        isNodeVersionSupported(),
        `${process.versions.node} should be supported`,
      );
    });

    it("is true when the major version is above the minimum and odd (non-LTS)", () => {
      const [major, minor, patch] = MIN_SUPPORTED_NODE_VERSION;

      setNodeVersion(`${major + 1}.${minor}.${patch}`);
      assert(
        isNodeVersionSupported(),
        `${process.versions.node} should be supported`,
      );
    });
  });

  describe("exitIfNodeVersionNotSupported", () => {
    it("writes an error to stderr and calls process.exit(1) when the version is unsupported", (t) => {
      const [major, minor, patch] = MIN_SUPPORTED_NODE_VERSION;
      const unsupported = `${major}.${minor}.${patch - 1}`;

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
        writtenMessage.includes(MIN_SUPPORTED_NODE_VERSION.join(".")),
        `stderr message should include the minimum version (${MIN_SUPPORTED_NODE_VERSION.join(".")}): ${writtenMessage}`,
      );
    });

    it("does nothing when the version is supported", (t) => {
      const [major, minor, patch] = MIN_SUPPORTED_NODE_VERSION;

      setNodeVersion(`${major}.${minor}.${patch}`);

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
  });
});
