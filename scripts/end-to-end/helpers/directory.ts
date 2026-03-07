import path, { basename, dirname, resolve } from "node:path";
import type { Scenario, ScenarioDefinition } from "../types.ts";
import { isScenarioDefinition } from "../schema/scenario-schema.ts";
import { readFileSync } from "node:fs";

export function loadScenario(
  e2eCloneDirectory: string,
  scenarioFilePath: string,
): Scenario {
  const id = _resolveScenarioIdFrom(scenarioFilePath);

  const scenarioDir = _resolveScenarioDirFrom(scenarioFilePath);

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
  return path.join(e2eCloneDirectory, _resolveScenarioIdFrom(scenarioFilePath));
}

function _resolveScenarioIdFrom(scenarioFilePath): string {
  const absScenarioFilePath = resolve(scenarioFilePath);

  if (!absScenarioFilePath.endsWith("scenario.json")) {
    throw new Error("Scenario path must be to a scenario.json file");
  }

  return basename(dirname(absScenarioFilePath));
}

function _resolveScenarioDirFrom(scenarioFilePath: string): string {
  return dirname(resolve(scenarioFilePath));
}

function _readScenarioJson(scenarioFilePath: string): ScenarioDefinition {
  const raw = JSON.parse(readFileSync(scenarioFilePath, "utf-8")) as unknown;

  if (!isScenarioDefinition(raw)) {
    throw new Error(`Invalid scenario.json at ${path}`);
  }

  return raw;
}
