interface BaseGasMeasurement {
  contractFqn: string;
  gas: bigint;
}

interface FunctionGasMeasurement extends BaseGasMeasurement {
  type: "function";
  functionSig: string;
}

interface DeploymentGasMeasurement extends BaseGasMeasurement {
  type: "deployment";
  size: bigint;
}

export type GasMeasurement = FunctionGasMeasurement | DeploymentGasMeasurement;

export interface GasAnalyticsManager {
  /* Gas Statistics */
  addGasMeasurement(gasMeasurement: GasMeasurement): void;
  clearGasStats(id: string): Promise<void>;
  saveGasStats(id: string): Promise<void>;
  reportGasStats(...ids: string[]): Promise<void>;
}
