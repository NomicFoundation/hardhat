import type { ScenarioDefinition } from "../types.ts";

export function isScenarioDefinition(
  value: unknown,
): value is ScenarioDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.description === "string" &&
    typeof obj.repo === "string" &&
    typeof obj.commit === "string" &&
    (obj.packageManager === "npm" ||
      obj.packageManager === "bun" ||
      obj.packageManager === "yarn" ||
      obj.packageManager === "pnpm") &&
    typeof obj.defaultCommand === "string" &&
    Array.isArray(obj.tags) &&
    obj.tags.every((t: unknown) => typeof t === "string") &&
    (obj.env === undefined || isStringRecord(obj.env)) &&
    (obj.preinstall === undefined || typeof obj.preinstall === "string") &&
    (obj.install === undefined || typeof obj.install === "string") &&
    (obj.submodules === undefined || typeof obj.submodules === "boolean") &&
    (obj.disabled === undefined || obj.disabled === true) &&
    (obj.benchmark === undefined || isBenchmarkConfig(obj.benchmark))
  );
}

function isBenchmarkConfig(value: unknown): value is {
  skip?: true;
  runs?: {
    defaultCommand?: number;
    coldCompile?: number;
    warmCompile?: number;
  };
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    (obj.skip === undefined || obj.skip === true) &&
    (obj.runs === undefined || isBenchmarkRunsConfig(obj.runs))
  );
}

function isBenchmarkRunsConfig(value: unknown): value is {
  defaultCommand?: number;
  coldCompile?: number;
  warmCompile?: number;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    isPositiveIntegerOrUndefined(obj.defaultCommand) &&
    isPositiveIntegerOrUndefined(obj.coldCompile) &&
    isPositiveIntegerOrUndefined(obj.warmCompile)
  );
}

function isPositiveIntegerOrUndefined(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "number" && Number.isInteger(value) && value >= 1)
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Object.values(value as Record<string, unknown>).every(
    (v) => typeof v === "string",
  );
}
