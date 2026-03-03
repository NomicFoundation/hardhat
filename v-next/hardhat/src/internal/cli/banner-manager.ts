import type { Dispatcher } from "@nomicfoundation/hardhat-utils/request";

import path from "node:path";

import {
  readJsonFile,
  writeJsonFile,
  FileNotFoundError,
} from "@nomicfoundation/hardhat-utils/fs";
import { getCacheDir } from "@nomicfoundation/hardhat-utils/global-dir";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";
import { getRequest } from "@nomicfoundation/hardhat-utils/request";
import debug from "debug";

const log = debug("hardhat:util:banner-manager");

interface BannerConfig {
  enabled: boolean;
  formattedMessages: string[];
  minSecondsBetweenDisplays: number;
  minSecondsBetweenRequests: number;
}

export const BANNER_CONFIG_URL =
  "https://raw.githubusercontent.com/NomicFoundation/hardhat/refs/heads/main/banner-config-v3.json";

export const BANNER_CACHE_FILE_NAME = "banner-config-v3.json";

export class BannerManager {
  static #instance: BannerManager | undefined;

  #bannerConfig: BannerConfig | undefined;
  #lastDisplayTime: number;
  #lastRequestTime: number;
  readonly #dispatcher: Dispatcher | undefined;
  readonly #print: (message: string) => void;

  private constructor(
    bannerConfig: BannerConfig | undefined,
    lastDisplayTime: number,
    lastRequestTime: number,
    dispatcher: Dispatcher | undefined,
    print: (message: string) => void,
  ) {
    this.#bannerConfig = bannerConfig;
    this.#lastDisplayTime = lastDisplayTime;
    this.#lastRequestTime = lastRequestTime;
    this.#dispatcher = dispatcher;
    this.#print = print;
  }

  /**
   * Returns a global instance of BannerManager.
   *
   * @param options Options used for testing purposes. Only used in the first
   * invocation of this function, or after calling `resetInstance`.
   * @returns The current global instance of BannerManager.
   */
  public static async getInstance(options?: {
    testDispatcher?: Dispatcher;
    print?: (message: string) => void;
  }): Promise<BannerManager> {
    if (this.#instance === undefined) {
      log("Initializing BannerManager");
      const { bannerConfig, lastDisplayTime, lastRequestTime } =
        await readCache();
      this.#instance = new BannerManager(
        bannerConfig,
        lastDisplayTime,
        lastRequestTime,
        options?.testDispatcher,
        options?.print ?? console.log,
      );
    }

    return this.#instance;
  }

  public static resetInstance(): void {
    this.#instance = undefined;
  }

  /**
   * Displays a banner message, if any.
   *
   * @param timeout The timeout in milliseconds to wait for the banner display.
   */
  public async showBanner(timeout?: number): Promise<void> {
    await this.#requestBannerConfig(timeout);

    if (
      this.#bannerConfig === undefined ||
      !this.#bannerConfig.enabled ||
      this.#bannerConfig.formattedMessages.length === 0
    ) {
      log("Banner is disabled or no messages available.");
      return;
    }

    const { formattedMessages, minSecondsBetweenDisplays } = this.#bannerConfig;

    const timeSinceLastDisplay = Date.now() - this.#lastDisplayTime;
    if (timeSinceLastDisplay < minSecondsBetweenDisplays * 1000) {
      log(
        `Skipping banner display. Time since last display: ${timeSinceLastDisplay}ms`,
      );
      return;
    }

    // select a random message from the formattedMessages array
    const randomIndex = Math.floor(Math.random() * formattedMessages.length);
    const message = formattedMessages[randomIndex];

    this.#print(message);
    this.#lastDisplayTime = Date.now();
    await writeCache({
      bannerConfig: this.#bannerConfig,
      lastDisplayTime: this.#lastDisplayTime,
      lastRequestTime: this.#lastRequestTime,
    });
  }

  async #requestBannerConfig(timeout?: number): Promise<void> {
    if (this.#bannerConfig !== undefined) {
      const timeSinceLastRequest = Date.now() - this.#lastRequestTime;
      if (
        timeSinceLastRequest <
        this.#bannerConfig.minSecondsBetweenRequests * 1000
      ) {
        log(
          `Skipping banner config request. Time since last request: ${timeSinceLastRequest}ms`,
        );
        return;
      }
    }

    try {
      const response = await getRequest(
        BANNER_CONFIG_URL,
        undefined,
        this.#dispatcher ?? { timeout },
      );

      const bannerConfig: unknown = await response.body.json();

      if (!this.#isBannerConfig(bannerConfig)) {
        log(`Invalid banner config received:`, bannerConfig);
        return;
      }

      this.#bannerConfig = bannerConfig;
      this.#lastRequestTime = Date.now();

      await writeCache({
        bannerConfig: this.#bannerConfig,
        lastDisplayTime: this.#lastDisplayTime,
        lastRequestTime: this.#lastRequestTime,
      });
    } catch (error) {
      log(
        `Error requesting banner config: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      );
    }
  }

  #isBannerConfig(value: unknown): value is BannerConfig {
    if (!isObject(value)) {
      return false;
    }

    return (
      Object.getOwnPropertyNames(value).length === 4 &&
      "enabled" in value &&
      typeof value.enabled === "boolean" &&
      "formattedMessages" in value &&
      Array.isArray(value.formattedMessages) &&
      value.formattedMessages.every(
        (message: unknown) => typeof message === "string",
      ) &&
      "minSecondsBetweenDisplays" in value &&
      typeof value.minSecondsBetweenDisplays === "number" &&
      "minSecondsBetweenRequests" in value &&
      typeof value.minSecondsBetweenRequests === "number"
    );
  }
}

interface BannerCache {
  bannerConfig: BannerConfig | undefined;
  lastDisplayTime: number;
  lastRequestTime: number;
}

async function readCache(): Promise<BannerCache> {
  const cacheDir = await getCacheDir();
  const bannerCacheFilePath = path.join(cacheDir, BANNER_CACHE_FILE_NAME);

  try {
    return await readJsonFile<BannerCache>(bannerCacheFilePath);
  } catch (error) {
    if (error instanceof FileNotFoundError) {
      log("No banner cache file found, using defaults");
    } else {
      log(
        `Error reading cache file: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`,
      );
    }

    return {
      bannerConfig: undefined,
      lastDisplayTime: 0,
      lastRequestTime: 0,
    };
  }
}

async function writeCache(cache: BannerCache): Promise<void> {
  const cacheDir = await getCacheDir();
  const bannerCacheFilePath = path.join(cacheDir, BANNER_CACHE_FILE_NAME);

  try {
    await writeJsonFile(bannerCacheFilePath, cache);
  } catch (error) {
    log(
      `Error writing cache file: ${
        error instanceof Error ? error.message : JSON.stringify(error)
      }`,
    );
  }
}
