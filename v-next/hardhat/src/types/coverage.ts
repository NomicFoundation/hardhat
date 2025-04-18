export interface CoverageMetadata {
  [markerId: string]: {
    sourceName: string;
    kind: "statement";
    location: {
      start: number;
      end: number;
    };
  };
}
