import path from "node:path";
import fs from "node:fs/promises";
import { getCacheDir } from "../util/global-dir";

interface BannerConfig {
  enabled: boolean;
  formattedMessages: string[];
  minSecondsBetweenDisplays: number;
  minSecondsBetweenRequests: number;
}

export class BannerManager {
  private static _instance: BannerManager | undefined;

  private constructor(
    private _bannerConfig: BannerConfig | undefined,
    private _lastDisplayTime: number,
    private _lastRequestTime: number
  ) {}

  public static async getInstance(): Promise<BannerManager> {
    if (this._instance === undefined) {
      const { bannerConfig, lastDisplayTime, lastRequestTime } =
        await readCache();
      this._instance = new BannerManager(
        bannerConfig,
        lastDisplayTime,
        lastRequestTime
      );
    }

    return this._instance;
  }

  public async sendBannerConfigRequest(): Promise<[() => void, Promise<void>]> {
    const { request } = await import("undici");

    const controller = new AbortController();

    if (this._bannerConfig !== undefined) {
      const timeSinceLastRequest = Date.now() - this._lastRequestTime;
      if (
        timeSinceLastRequest <
        this._bannerConfig.minSecondsBetweenRequests * 1000
      ) {
        return [() => {}, Promise.resolve()];
      }
    }

    const bannerConfigRequest = request(
      "https://raw.githubusercontent.com/NomicFoundation/hardhat/refs/heads/main/banner-config.json",
      {
        method: "GET",
        signal: controller.signal,
      }
    )
      .then(async (githubResponse) => {
        if (githubResponse.statusCode === 200) {
          const bannerConfig =
            (await githubResponse.body.json()) as BannerConfig;

          this._bannerConfig = bannerConfig;
          this._lastRequestTime = Date.now();
          await writeCache({
            bannerConfig: this._bannerConfig,
            lastDisplayTime: this._lastDisplayTime,
            lastRequestTime: this._lastRequestTime,
          });
        }
      })
      .catch(() => {
        // do nothing
      });

    return [() => controller.abort(), bannerConfigRequest];
  }

  public async showBanner() {
    if (
      this._bannerConfig === undefined ||
      !this._bannerConfig.enabled ||
      this._bannerConfig.formattedMessages.length === 0
    ) {
      return;
    }

    const { formattedMessages, minSecondsBetweenDisplays } = this._bannerConfig;

    const timeSinceLastDisplay = Date.now() - this._lastDisplayTime;
    if (timeSinceLastDisplay < minSecondsBetweenDisplays * 1000) {
      return;
    }

    // select a random message from the formattedMessages array
    const randomIndex = Math.floor(Math.random() * formattedMessages.length);
    const message = formattedMessages[randomIndex];

    console.log(message);
    this._lastDisplayTime = Date.now();
    await writeCache({
      bannerConfig: this._bannerConfig,
      lastDisplayTime: this._lastDisplayTime,
      lastRequestTime: this._lastRequestTime,
    });
  }
}

interface BannerCache {
  bannerConfig: BannerConfig | undefined;
  lastDisplayTime: number;
  lastRequestTime: number;
}

async function readCache(): Promise<BannerCache> {
  const cacheDir = await getCacheDir();
  const versionNotifierCachePath = path.join(cacheDir, "banner-config.json");

  let cache: BannerCache = {
    bannerConfig: undefined,
    lastDisplayTime: 0,
    lastRequestTime: 0,
  };
  try {
    const fileContents = await fs.readFile(versionNotifierCachePath, "utf-8");
    cache = JSON.parse(fileContents);
  } catch {
    // do nothing
  }

  return cache;
}

async function writeCache(cache: BannerCache) {
  const cacheDir = await getCacheDir();
  const versionNotifierCachePath = path.join(cacheDir, "banner-config.json");

  try {
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(
      versionNotifierCachePath,
      JSON.stringify(cache, null, 2)
    );
  } catch {
    // do nothing
  }
}
