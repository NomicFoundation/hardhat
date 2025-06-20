import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, describe, it, mock } from "node:test";

import { useTmpDir } from "@nomicfoundation/hardhat-test-utils";
import { writeJsonFile } from "@nomicfoundation/hardhat-utils/fs";

import { BuildInfoWatcher } from "../../../../../src/internal/builtin-plugins/node/artifacts/build-info-watcher.js";

describe("BuildInfoWatcher", function () {
  useTmpDir();

  let buildInfoDirPath: string;
  let watcher: BuildInfoWatcher;

  beforeEach(async () => {
    buildInfoDirPath = process.cwd();
    watcher = new BuildInfoWatcher(process.cwd());
  });

  afterEach(async () => {
    await watcher.waitUntilClosed();
  });

  describe("waitUntilBuildFinished", async () => {
    it("should fail if the build info file is not found", async function () {
      const buildId = "123";

      await writeJsonFile(
        path.join(buildInfoDirPath, `${buildId}.output.json`),
        "{}",
      );

      // eslint-disable-next-line no-restricted-syntax -- We want to test the error message
      await assert.rejects(watcher.waitUntilBuildFinished(buildId), {
        name: "FileNotFoundError",
        message: `File ${path.join(buildInfoDirPath, `${buildId}.json`)} not found`,
      });
    });

    it("should fail if the build info output file is not found", async function () {
      const buildId = "123";

      await writeJsonFile(path.join(buildInfoDirPath, `${buildId}.json`), "{}");

      // eslint-disable-next-line no-restricted-syntax -- We want to test the error message
      await assert.rejects(watcher.waitUntilBuildFinished(buildId), {
        name: "FileNotFoundError",
        message: `File ${path.join(buildInfoDirPath, `${buildId}.output.json`)} not found`,
      });
    });

    it("should resolve if both files are stable ", async function () {
      const buildId = "123";

      await writeJsonFile(path.join(buildInfoDirPath, `${buildId}.json`), "{}");
      await writeJsonFile(
        path.join(buildInfoDirPath, `${buildId}.output.json`),
        "{}",
      );

      await watcher.waitUntilBuildFinished(buildId);
    });
  });

  describe("listener", async () => {
    it("should not proceed if the build info file does not exist", async function () {
      const buildId = "123";

      const waitUntilBuildFinished = mock.fn(async () => {});
      watcher.waitUntilBuildFinished = waitUntilBuildFinished;

      await writeJsonFile(
        path.join(buildInfoDirPath, `${buildId}.output.json`),
        "{}",
      );

      await watcher.listener(path.join(buildInfoDirPath, `${buildId}.json`));

      await watcher.waitUntilClosed();

      assert.equal(waitUntilBuildFinished.mock.callCount(), 0);
    });

    it("should not proceed if the build info output file does not exist", async function () {
      const buildId = "123";

      const waitUntilBuildFinished = mock.fn(async () => {});
      watcher.waitUntilBuildFinished = waitUntilBuildFinished;

      await writeJsonFile(path.join(buildInfoDirPath, `${buildId}.json`), "{}");

      await watcher.listener(path.join(buildInfoDirPath, `${buildId}.json`));

      assert.equal(waitUntilBuildFinished.mock.callCount(), 0);
    });

    it("should not proceed if a build is already being awaited", async function () {
      const buildId = "123";

      let resolvePromise: () => void = () => {};
      const waitUntilBuildFinishedPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const waitUntilBuildFinished = mock.fn(
        async () => waitUntilBuildFinishedPromise,
      );
      watcher.waitUntilBuildFinished = waitUntilBuildFinished;

      await writeJsonFile(path.join(buildInfoDirPath, `${buildId}.json`), "{}");
      await writeJsonFile(
        path.join(buildInfoDirPath, `${buildId}.output.json`),
        "{}",
      );

      await watcher.listener(path.join(buildInfoDirPath, `${buildId}.json`));
      await watcher.listener(path.join(buildInfoDirPath, `${buildId}.json`));

      resolvePromise();

      assert.equal(waitUntilBuildFinished.mock.callCount(), 1);
    });
  });
});
