export interface CoverageConfig {
  onCollectedCoverageCallback: (coverageData: Uint8Array[]) => Promise<void>;
}
