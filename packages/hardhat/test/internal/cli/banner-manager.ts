import assert from "node:assert/strict";
import path from "node:path";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";

import { getTmpDir } from "@nomicfoundation/hardhat-test-utils";
import {
  readJsonFile,
  writeJsonFile,
  remove,
} from "@nomicfoundation/hardhat-utils/fs";
import {
  getCacheDir,
  resetMockCacheDir,
  setMockCacheDir,
} from "@nomicfoundation/hardhat-utils/global-dir";
import {
  getTestDispatcher,
  type Interceptable,
  type TestDispatcher,
} from "@nomicfoundation/hardhat-utils/request";

import {
  BANNER_CACHE_FILE_NAME,
  BANNER_CONFIG_URL,
  BannerManager,
} from "../../../src/internal/cli/banner-manager.js";

function makeValidConfig({
  enabled = true,
  formattedMessages = ["Hello from Hardhat!"],
  minSecondsBetweenDisplays = 0,
  minSecondsBetweenRequests = 0,
} = {}) {
  return {
    enabled,
    formattedMessages,
    minSecondsBetweenDisplays,
    minSecondsBetweenRequests,
  };
}

describe("BannerManager", () => {
  let testCacheRoot: string;
  let cacheDir: string;
  let printed: string[];
  let mockAgent: TestDispatcher;
  let interceptor: Interceptable;
  const print = (message: string) => {
    printed.push(message);
  };

  const baseInterceptorOptions = {
    path: new URL(BANNER_CONFIG_URL).pathname,
    method: "GET",
  };

  before(async () => {
    testCacheRoot = await getTmpDir("banner-manager-test-cache");
    setMockCacheDir(testCacheRoot);
    cacheDir = await getCacheDir();
  });

  after(async () => {
    resetMockCacheDir();
    await remove(testCacheRoot);
  });

  beforeEach(async () => {
    mockAgent = await getTestDispatcher();
    interceptor = mockAgent.get("https://raw.githubusercontent.com");
    mockAgent.disableNetConnect();
    printed = [];
  });

  afterEach(async () => {
    BannerManager.resetInstance();
    mockAgent.enableNetConnect();
    await mockAgent.close();

    // Delete the cache file if exists
    try {
      await remove(path.join(cacheDir, BANNER_CACHE_FILE_NAME));
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe("getInstance", () => {
    it("should return an instance when no cache file exists", async () => {
      const instance = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      assert.ok(
        instance instanceof BannerManager,
        "Expected a BannerManager instance",
      );
    });

    it("should return an instance when a cache file exists", async () => {
      // Write a cache file
      await writeJsonFile(path.join(cacheDir, BANNER_CACHE_FILE_NAME), {
        bannerConfig: makeValidConfig(),
        lastDisplayTime: 0,
        lastRequestTime: 0,
      });

      const instance = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      assert.ok(
        instance instanceof BannerManager,
        "Expected a BannerManager instance",
      );
    });
  });

  describe("showBanner", () => {
    it("should fetch config and display message", async () => {
      const config = makeValidConfig();

      interceptor.intercept(baseInterceptorOptions).reply(200, config);

      const instance = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      await instance.showBanner();

      assert.deepEqual(printed, ["Hello from Hardhat!"]);
    });

    it("should not display when banner is disabled", async () => {
      const config = makeValidConfig({ enabled: false });

      interceptor.intercept(baseInterceptorOptions).reply(200, config);

      const instance = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      await instance.showBanner();

      assert.deepEqual(printed, []);
    });

    it("should's display the banner more often than minSecondsBetweenDisplays", async () => {
      // Store a cache file with recent lastDisplayTime and high
      // minSecondsBetweenDisplays
      await writeJsonFile(path.join(cacheDir, BANNER_CACHE_FILE_NAME), {
        bannerConfig: makeValidConfig({
          minSecondsBetweenDisplays: 9999,
        }),
        lastDisplayTime: Date.now(),
        lastRequestTime: 0,
      });

      interceptor
        .intercept(baseInterceptorOptions)
        .reply(200, makeValidConfig({ minSecondsBetweenDisplays: 9999 }));

      const instance = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      await instance.showBanner();

      assert.deepEqual(printed, []);
    });

    it("shouldn't re-fetch the config more often than minSecondsBetweenRequests", async () => {
      // Store a cache file with recent lastRequestTime and high
      // minSecondsBetweenRequests
      await writeJsonFile(path.join(cacheDir, BANNER_CACHE_FILE_NAME), {
        bannerConfig: makeValidConfig({
          minSecondsBetweenRequests: 9999,
          minSecondsBetweenDisplays: 9999,
        }),
        lastDisplayTime: Date.now(),
        lastRequestTime: Date.now(),
      });

      let getCallMade = false;
      interceptor.intercept(baseInterceptorOptions).reply(200, () => {
        getCallMade = true;
        return makeValidConfig();
      });

      const instance = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      await instance.showBanner();

      assert.deepEqual(printed, []);
      assert.equal(getCallMade, false, "No HTTP request should have been made");
    });

    it("should handle HTTP errors gracefully", async () => {
      interceptor
        .intercept(baseInterceptorOptions)
        .reply(500, "Internal Server Error");

      const instance = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      await instance.showBanner();

      assert.deepEqual(printed, []);
    });

    it("should handle invalid config gracefully", async () => {
      interceptor
        .intercept(baseInterceptorOptions)
        .reply(200, { invalid: "data" });

      const instance = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      // Should not throw
      await instance.showBanner();

      assert.deepEqual(printed, []);
    });

    it("should write cache after displaying banner", async () => {
      const config = makeValidConfig();

      interceptor.intercept(baseInterceptorOptions).reply(200, config);

      const instance = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      const beforeTime = Date.now();
      await instance.showBanner();

      const cache = await readJsonFile<{
        bannerConfig: unknown;
        lastDisplayTime: number;
        lastRequestTime: number;
      }>(path.join(cacheDir, BANNER_CACHE_FILE_NAME));

      assert.ok(
        cache.lastDisplayTime >= beforeTime,
        "lastDisplayTime should be recent",
      );
      assert.ok(
        cache.lastRequestTime >= beforeTime,
        "lastRequestTime should be recent",
      );
    });

    it("should use cached config without making HTTP request", async () => {
      await writeJsonFile(path.join(cacheDir, BANNER_CACHE_FILE_NAME), {
        bannerConfig: makeValidConfig({
          formattedMessages: ["Cached message"],
          minSecondsBetweenRequests: 9999,
        }),
        lastDisplayTime: 0,
        lastRequestTime: Date.now(),
      });

      let getCallMade = false;
      interceptor.intercept(baseInterceptorOptions).reply(200, () => {
        getCallMade = true;
        return makeValidConfig();
      });

      const instance = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      await instance.showBanner();

      assert.deepEqual(printed, ["Cached message"]);
      assert.equal(getCallMade, false, "No HTTP request should have been made");
    });
  });

  describe("resetInstance", () => {
    it("should allow creating a fresh instance after reset", async () => {
      await writeJsonFile(path.join(cacheDir, BANNER_CACHE_FILE_NAME), {
        bannerConfig: makeValidConfig({
          formattedMessages: ["First message"],
          minSecondsBetweenRequests: 9999,
        }),
        lastDisplayTime: 0,
        lastRequestTime: Date.now(),
      });

      const first = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      await first.showBanner();
      assert.deepEqual(printed, ["First message"]);

      BannerManager.resetInstance();
      printed = [];

      await writeJsonFile(path.join(cacheDir, BANNER_CACHE_FILE_NAME), {
        bannerConfig: makeValidConfig({
          formattedMessages: ["Second message"],
          minSecondsBetweenRequests: 9999,
        }),
        lastDisplayTime: 0,
        lastRequestTime: Date.now(),
      });

      const second = await BannerManager.getInstance({
        testDispatcher: interceptor,
        print,
      });

      await second.showBanner();
      assert.deepEqual(printed, ["Second message"]);
    });
  });
});
