import { existsSync } from "node:fs";

import { loadScenario } from "./directory.ts";
import {
  init,
  type ForceCheckout,
  type ForcePublish,
  type UseLocal,
} from "../subcommands/init.ts";
import type { Scenario } from "../types.ts";

/**
 * Loads a scenario, initializing it when its working directory does not
 * exist yet or when `forceInit` is true.
 */
export async function ensureScenarioInitialized(
  e2eCloneDirectory: string,
  scenarioPath: string,
  useLocal: UseLocal,
  forceCheckout: ForceCheckout,
  forcePublish: ForcePublish,
  forceInit: boolean = false,
): Promise<Scenario> {
  const scenario = loadScenario(e2eCloneDirectory, scenarioPath);

  if (forceInit || !existsSync(scenario.workingDir)) {
    await init(
      e2eCloneDirectory,
      scenarioPath,
      useLocal,
      forceCheckout,
      forcePublish,
    );
  }

  return scenario;
}
