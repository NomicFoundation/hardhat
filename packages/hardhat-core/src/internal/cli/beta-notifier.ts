interface Hardhat3Banner {
  enabled: boolean;
  formattedMessages: string[];
  minSecondsBetweenDisplays: number;
  minSecondsBetweenRequests: number;
}

export class Hardhat3BannerManager {
  private static _instance: Hardhat3BannerManager | undefined;

  private _bannerConfig: Hardhat3Banner | undefined;

  private constructor() {}

  public static getInstance(): Hardhat3BannerManager {
    if (this._instance === undefined) {
      this._instance = new Hardhat3BannerManager();
    }

    return this._instance;
  }

  public async sendBannerConfigRequest(): Promise<[() => void, Promise<void>]> {
    const { request } = await import("undici");

    const controller = new AbortController();

    const bannerConfigRequest = request(
      "https://raw.githubusercontent.com/schaable/hardhat/refs/heads/main/beta-banner.json",
      {
        method: "GET",
        signal: controller.signal,
      }
    )
      .then(async (githubResponse) => {
        if (githubResponse.statusCode === 200) {
          const bannerConfig =
            (await githubResponse.body.json()) as Hardhat3Banner;

          this._bannerConfig = bannerConfig;
        }
      })
      .catch(() => {
        // do nothing
      });

    return [() => controller.abort(), bannerConfigRequest];
  }

  public showBanner() {
    if (this._bannerConfig === undefined || !this._bannerConfig.enabled) {
      return;
    }

    const { formattedMessages } = this._bannerConfig;

    // select a random message from the formattedMessages array
    const randomIndex = Math.floor(Math.random() * formattedMessages.length);
    const message = formattedMessages[randomIndex];

    console.log(message);
  }
}
