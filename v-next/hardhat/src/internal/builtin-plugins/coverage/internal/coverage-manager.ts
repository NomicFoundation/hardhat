import type { CoverageManager } from "./types.js";
import type { CoverageReport } from "../../../../types/coverage.js";
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
  readonly #report: CoverageReport = {
    markerIds: [],
  };

  public async addProvider(id: string, provider: EdrProvider): Promise<void> {
    this.#providers[id] = provider;
  }

  public async removeProvider(id: string): Promise<void> {
    const _provider = this.#providers[id];
    // TODO: Get the coverage data from the EDR provider before it is closed

    delete this.#providers[id];
  }

  public async getReport(): Promise<CoverageReport> {
    // NOTE: Draining the providers first to ensure all the coverage data is in the report
    await Promise.all(
      Object.keys(this.#providers).map((id) => this.removeProvider(id)),
    );
    return this.#report;
  }
}
