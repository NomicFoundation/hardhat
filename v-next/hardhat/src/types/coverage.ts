export interface CoverageReport {
  markerIds: string[];
}

export interface CoverageManager {
  save(): Promise<void>;
  read(): Promise<CoverageReport>;
}
