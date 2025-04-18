import type { CoverageManager } from "./types.js";
import type { CoverageHits } from "../../../../types/coverage.js";
import type { EdrProvider } from "../../network-manager/edr/edr-provider.js";

export class CoverageManagerImplementation implements CoverageManager {
  static #coverageManager?: CoverageManager;

  public static getOrCreate(): CoverageManager {
    if (this.#coverageManager === undefined) {
      this.#coverageManager = new CoverageManagerImplementation();
    }
    return this.#coverageManager;
  }

  private constructor() {}

  readonly #providers: Record<string, EdrProvider> = {};
  readonly #hits: CoverageHits = {};

  public async addProvider(id: string, provider: EdrProvider): Promise<void> {
    this.#providers[id] = provider;
  }

  public async removeProvider(id: string): Promise<void> {
    const _provider = this.#providers[id];
    // TODO: Get the coverage data from the EDR provider before it is closed

    delete this.#providers[id];
  }

  public async getProviderHits(): Promise<CoverageHits> {
    // NOTE: Draining the providers first to ensure all the hits were collected
    await Promise.all(
      Object.keys(this.#providers).map((id) => this.removeProvider(id)),
    );
    return this.#hits;
  }

  public async clearProviderHits(): Promise<void> {
    await Promise.all(
      Object.keys(this.#hits).map((id) => {
        delete this.#hits[id];
      }),
    );
  }
}
