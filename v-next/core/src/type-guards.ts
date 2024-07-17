import type { TaskDefinition } from "./types/tasks.js";

import {
  ArgumentType,
  type OptionDefinition,
  type PositionalArgumentDefinition,
} from "./types/arguments.js";
import { TaskDefinitionType } from "./types/tasks.js";

function isValidEnumValue(
  theEnum: Record<string, string>,
  value: string,
): boolean {
  // Enums are objects that have entries that map:
  //   1) keys to values
  //   2) values to keys
  const key = theEnum[value];
  if (key === undefined) {
    return false;
  }

  return theEnum[key] === value;
}

/**
 * Returns true if `potential` is a `TaskDefinition`.
 */
export function isTaskDefinition(
  potential: unknown,
): potential is TaskDefinition {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    typeof potential.type === "string" &&
    isValidEnumValue(TaskDefinitionType, potential.type)
  );
}

/**
 * Returns true if `potential` is a `OptionDefinition`.
 */
export function isOptionDefinition(
  potential: unknown,
): potential is OptionDefinition {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    typeof potential.type === "string" &&
    isValidEnumValue(ArgumentType, potential.type) &&
    !("isVariadic" in potential)
  );
}

/**
 * Returns true if `potential` is a `PositionalArgumentDefinition`.
 */
export function isPositionalArgumentDefinition(
  potential: unknown,
): potential is PositionalArgumentDefinition {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    typeof potential.type === "string" &&
    isValidEnumValue(ArgumentType, potential.type) &&
    "isVariadic" in potential
  );
}
