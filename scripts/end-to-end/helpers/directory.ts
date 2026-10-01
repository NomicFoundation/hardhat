import path, { basename, dirname, resolve } from "node:path";
import type { Scenario, ScenarioDefinition } from "../types.ts";
import {
  isScenarioDefinition,
  validateScenarioSource,
} from "../schema/scenario-schema.ts";
import { readFileSync } from "node:fs";
import { resolveEnv } from "./env.ts";

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

  if (definition.env !== undefined) {
    definition.env = resolveEnv(definition.env, scenarioFilePath);
  }

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
 * Resolve a path given by the user. pnpm runs scripts from the
 * package root and stores the invoking directory in INIT_CWD, so a
 * relative path resolves there. Without INIT_CWD, as in a direct node
 * run, it resolves against cwd. An undefined path passes through.
 */
export function resolveInvocationPath(givenPath: string): string;
export function resolveInvocationPath(
  givenPath: string | undefined,
): string | undefined;
export function resolveInvocationPath(
  givenPath: string | undefined,
): string | undefined {
  return givenPath === undefined
    ? undefined
    : resolve(process.env.INIT_CWD ?? process.cwd(), givenPath);
}

/**
 * Normalize a scenario path to always point at the scenario.json file.
 * Accepts either a directory or a direct path to scenario.json.
 */
export function normalizeScenarioPath(scenarioPath: string): string {
  const abs = resolveInvocationPath(scenarioPath);

  if (abs.endsWith("scenario.json")) {
    return abs;
  }

  return resolve(abs, "scenario.json");
}

function _readScenarioJson(scenarioFilePath: string): ScenarioDefinition {
  const raw = JSON.parse(readFileSync(scenarioFilePath, "utf-8")) as unknown;

  // Throws targeted errors for commit/branch misuse; anything else malformed
  // falls through to the generic guard error below.
  validateScenarioSource(raw, scenarioFilePath);

  if (!isScenarioDefinition(raw)) {
    throw new Error(`Invalid scenario.json at ${scenarioFilePath}`);
  }

  return raw;
}
