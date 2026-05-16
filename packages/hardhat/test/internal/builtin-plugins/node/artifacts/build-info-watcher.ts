import assert from "node:assert/strict";
import path from "node:path";
import { describe, it, mock } from "node:test";

import { createTmpDir } from "@nomicfoundation/hardhat-test-utils";

import { listener } from "../../../../../src/internal/builtin-plugins/node/artifacts/build-info-watcher.js";

describe("build-info-watcher", function () {
  const tmp = createTmpDir("build-info-watcher", "test");

  describe("listener", async () => {
    it("should not call the handler when a build info output file is added", async function () {
      const buildId = "123";

      const handler = mock.fn(async () => {});

      await listener(handler, path.join(tmp.path, `${buildId}.output.json`));

      assert.equal(handler.mock.callCount(), 0);
    });

    it("should call the handler when a build info file is added", async function () {
      const buildId = "123";

      const handler = mock.fn(async () => {});

      await listener(handler, path.join(tmp.path, `${buildId}.json`));

      assert.equal(handler.mock.callCount(), 1);
    });
  });
});
