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
  addGasMeasurement(gasMeasurement: GasMeasurement): Promise<void>;
}
