import path, { basename, dirname, resolve } from "node:path";
import type { Scenario, ScenarioDefinition } from "../types.ts";
import { isScenarioDefinition } from "../schema/scenario-schema.ts";
import { readFileSync } from "node:fs";

export function loadScenario(
  e2eCloneDirectory: string,
  scenarioFilePath: string,
): Scenario {
  const id = basename(dirname(scenarioFilePath));
  const scenarioDir = dirname(scenarioFilePath);
  const workingDir = resolveScenarioWorkingDir(
    e2eCloneDirectory,
    scenarioFilePath,
  );
  const definition = _readScenarioJson(scenarioFilePath);

  return {
    id,
    scenarioDir,
    workingDir,
    definition,
  };
}

/**
 * Resolve the working directory for a scenario.
 * Always uses the scenario slug (basename of scenarioDir): <cloneBaseDir>/<slug>
 * e.g. /tmp/end-to-end/openzeppelin-contracts
 */
export function resolveScenarioWorkingDir(
  e2eCloneDirectory: string,
  scenarioFilePath: string,
): string {
  return path.join(e2eCloneDirectory, basename(dirname(scenarioFilePath)));
}

/**
 * Normalize a scenario path to always point at the scenario.json file.
 * Accepts either a directory or a direct path to scenario.json.
 */
export function normalizeScenarioPath(scenarioPath: string): string {
  const abs = resolve(scenarioPath);

  if (abs.endsWith("scenario.json")) {
    return abs;
  }

  return resolve(abs, "scenario.json");
}

function _readScenarioJson(scenarioFilePath: string): ScenarioDefinition {
  const raw = JSON.parse(readFileSync(scenarioFilePath, "utf-8")) as unknown;

  if (!isScenarioDefinition(raw)) {
    throw new Error(`Invalid scenario.json at ${scenarioFilePath}`);
  }

  return raw;
}
