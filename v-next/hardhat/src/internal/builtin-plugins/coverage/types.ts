export type CoverageMetadata = Array<{
  tag: Buffer
  kind: string
  startUtf16: number
  endUtf16: number
}>;
export type CoverageData = Buffer[];
