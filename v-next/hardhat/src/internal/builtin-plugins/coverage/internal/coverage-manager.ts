import type { InternalCoverageManager } from "./types.js";
import type { CoverageHits } from "../../../../types/coverage.js";
import type { EdrProvider } from "../../network-manager/edr/edr-provider.js";

let internalCoverageManager: InternalCoverageManager | undefined;

export async function getOrCreateInternalCoverageManager(): Promise<InternalCoverageManager> {
  if (internalCoverageManager === undefined) {
    internalCoverageManager = new InternalCoverageManagerImplementation();
  }
  return internalCoverageManager;
}

class InternalCoverageManagerImplementation implements InternalCoverageManager {
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
