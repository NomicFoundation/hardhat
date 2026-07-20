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

  const hasCommit = "commit" in obj;
  const hasBranch = "branch" in obj;

  // Exactly one of `commit` | `branch` must be present.
  if (hasCommit === hasBranch) {
    return false;
  }

  return (
    typeof obj.description === "string" &&
    typeof obj.repo === "string" &&
    (hasBranch
      ? typeof obj.branch === "string"
      : typeof obj.commit === "string") &&
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

/**
 * Throws a targeted error for commit/branch misuse in a scenario definition:
 *
 * - Exactly one of `commit` | `branch` must be specified.
 * - `branch` is only allowed for repos in the NomicFoundation GitHub
 *   organisation (compared case-insensitively, as GitHub org names are
 *   case-insensitively unique).
 *
 * Anything else malformed is left to `isScenarioDefinition`'s generic error.
 */
export function validateScenarioSource(
  value: unknown,
  scenarioFilePath: string,
): void {
  if (typeof value !== "object" || value === null) {
    return;
  }

  const obj = value as Record<string, unknown>;

  const hasCommit = "commit" in obj;
  const hasBranch = "branch" in obj;

  if (hasCommit === hasBranch) {
    throw new Error(
      `Invalid scenario.json at ${scenarioFilePath}: exactly one of "commit" or "branch" must be specified`,
    );
  }

  if (hasBranch && typeof obj.repo === "string") {
    const org = obj.repo.split("/")[0];

    if (org.toLowerCase() !== "nomicfoundation") {
      throw new Error(
        `Invalid scenario.json at ${scenarioFilePath}: "branch" is only allowed for repos in the NomicFoundation GitHub organisation, but "repo" is "${obj.repo}". A branch checkout automatically tracks the branch's latest tip, so restricting it to NomicFoundation ensures a security breach in an external organisation or account cannot automatically affect our end-to-end scenarios. Pin external repos to a "commit" instead.`,
      );
    }
  }
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
