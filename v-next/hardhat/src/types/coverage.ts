export interface CoverageManager {
  save(): Promise<void>;
  clear(): Promise<void>;
}
