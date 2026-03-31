/**
 * Gas statistics for a single function call or deployment (min/max/avg/median/count).
 */
export interface GasStatsJsonEntry {
  min: number;
  max: number;
  avg: number;
  median: number;
  count: number;
}

/**
 * Gas statistics for a single contract in the JSON output.
 * `deployment` is null when the contract was never deployed during the test run
 * (e.g. deployed by a factory or via forking). `functions` is null when the
 * contract was deployed but no functions were called.
 */
export interface ContractGasStatsJson {
  sourceName: string;
  contractName: string;
  deployment: GasStatsJsonEntry | null;
  functions: Record<string, GasStatsJsonEntry> | null;
}

/**
 * Top-level JSON output shape produced by `--gas-stats-json`.
 * Contract keys are user-friendly FQNs (e.g. `contracts/Foo.sol:Foo`),
 * sorted alphabetically.
 */
export interface GasStatsJson {
  contracts: Record<string, ContractGasStatsJson>;
}

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
  writeGasStatsJson(outputPath: string, ...ids: string[]): Promise<void>;

  enableReport(): void;
  disableReport(): void;
}
