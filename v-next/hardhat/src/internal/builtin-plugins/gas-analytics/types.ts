interface BaseGasMeasurement {
  contractFqn: string;
  gas: number;
}

interface FunctionGasMeasurement extends BaseGasMeasurement {
  type: "function";
  functionSig: string;
}

interface DeploymentGasMeasurement extends BaseGasMeasurement {
  type: "deployment";
  size: number;
}

export type GasMeasurement = FunctionGasMeasurement | DeploymentGasMeasurement;

export interface GasAnalyticsManager {
  /* Gas Statistics */
  addGasMeasurement(gasMeasurement: GasMeasurement): void;
  clearGasMeasurements(id: string): Promise<void>;
  saveGasMeasurements(id: string): Promise<void>;
  reportGasStats(...ids: string[]): Promise<void>;
}
