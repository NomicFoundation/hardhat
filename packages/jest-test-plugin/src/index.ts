import type { Config } from "@jest/types";
import { HardhatConfig } from "hardhat/types/config";

export async function runTests(
  parallel: boolean,
  bail: boolean,
  testFiles: string[],
  hhConfig: HardhatConfig,
  grep?: string
): Promise<number> {
  console.debug("[DEBUG]: using jest test module"); // TODO: remove

  const jestConfig: Config.Argv = {
    _: [],
    $0: "",
    ...hhConfig.test?.config,
  };

  if (grep !== undefined) {
    jestConfig.testRegex = grep;
  }

  if (bail) {
    jestConfig.bail = true;
  }

  if (parallel) {
    jestConfig.workerThreads = true;
  }

  const { runCLI } = await import("jest");
  const res = await runCLI(jestConfig, testFiles);

  return res.results.numFailedTests;
}
