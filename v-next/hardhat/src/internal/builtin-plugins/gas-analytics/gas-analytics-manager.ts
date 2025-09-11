import type { GasAnalyticsManager, GasMeasurement } from "./types.js";

export class GasAnalyticsManagerImplementation implements GasAnalyticsManager {
  public async addGasMeasurement(
    _gasMeasurement: GasMeasurement,
  ): Promise<void> {
    // TODO
  }
}
