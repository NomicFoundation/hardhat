export interface CoverageConfig {
  onCollectedCoverageCallback: (coverageData: Buffer[]) => void;
}
