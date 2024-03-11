import { HardhatConfig } from "../config";

export type RunTests = (
  parallel: boolean,
  bail: boolean,
  testFiles: string[],
  hhConfig: HardhatConfig,
  grep?: string
) => Promise<number>;
