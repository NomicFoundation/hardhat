export interface CoverageReport {
  markerIds: string[];
}

export interface CoverageManager {
  save(): Promise<void>;
  load(): Promise<CoverageReport>;
}
