import type {
  CommandConfig,
  ScenarioDefinition,
  StepConfig,
} from "../types.ts";

/** Matches integer-like keys, which V8 reorders ahead of string keys. */
const INTEGER_LIKE_KEY = /^\d+$/;

function isPositiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

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

export function isBenchmarkConfig(value: unknown): value is {
  skip?: true;
  commands?: Record<string, CommandConfig>;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const allowedKeys = new Set(["skip", "commands"]);

  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      return false;
    }
  }

  if (obj.skip === undefined && obj.commands === undefined) {
    return false;
  }

  return (
    (obj.skip === undefined || obj.skip === true) &&
    (obj.commands === undefined || isCommandsMap(obj.commands))
  );
}

function isCommandsMap(value: unknown): value is Record<string, CommandConfig> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);

  if (keys.length === 0) {
    return false;
  }

  // Reject empty and integer-like keys so the declared command order is
  // preserved (V8 iterates integer-like keys ahead of string keys).
  return (
    keys.every((k) => k.length > 0 && !INTEGER_LIKE_KEY.test(k)) &&
    Object.values(obj).every(isCommandConfig)
  );
}

export function isCommandConfig(value: unknown): value is CommandConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const hasCommand = "command" in obj;
  const hasSteps = "steps" in obj;

  // Exactly one of `command` | `steps` must be present.
  if (hasCommand === hasSteps) {
    return false;
  }

  return hasSteps ? isStepsVariant(obj) : isCommandVariant(obj);
}

function isCommandVariant(obj: Record<string, unknown>): boolean {
  const allowedKeys = new Set(["runs", "prepare", "command"]);

  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      return false;
    }
  }

  return (
    isPositiveInteger(obj.runs) &&
    typeof obj.command === "string" &&
    obj.command.length > 0 &&
    (obj.prepare === undefined ||
      (typeof obj.prepare === "string" && obj.prepare.length > 0))
  );
}

function isStepsVariant(obj: Record<string, unknown>): boolean {
  const allowedKeys = new Set(["runs", "steps"]);

  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      return false;
    }
  }

  return isPositiveInteger(obj.runs) && isStepsMap(obj.steps);
}

function isStepsMap(value: unknown): value is Record<string, StepConfig> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj);

  if (keys.length === 0) {
    return false;
  }

  // Reject empty and integer-like keys so the declared step order is preserved
  // (V8 iterates integer-like keys ahead of string keys).
  return (
    keys.every((k) => k.length > 0 && !INTEGER_LIKE_KEY.test(k)) &&
    Object.values(obj).every(isStepConfig)
  );
}

export function isStepConfig(value: unknown): value is StepConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  const allowedKeys = new Set(["command", "measure"]);

  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      return false;
    }
  }

  return (
    typeof obj.command === "string" &&
    obj.command.length > 0 &&
    (obj.measure === undefined || typeof obj.measure === "boolean")
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
