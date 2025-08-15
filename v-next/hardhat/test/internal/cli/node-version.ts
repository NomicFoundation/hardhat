import assert from "node:assert/strict";
import { describe, it, afterEach, beforeEach } from "node:test";

import {
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

    it("is false when the major version is above the minimum but non LTS (odd)", async () => {
      const [major, minor, patch] = MIN_SUPPORTED_NODE_VERSION;

      setNodeVersion(`${major + 1}.${minor}.${patch}`);
      assert(
        !isNodeVersionSupported(),
        `${process.versions.node} should not be supported`,
      );
    });
  });
});
