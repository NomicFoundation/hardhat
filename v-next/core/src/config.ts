import type { ArgumentTypeToValueType } from "./types/arguments.js";
import type { ConfigurationVariable } from "./types/config.js";
import type { GlobalOptionDefinition } from "./types/global-options.js";
import type {
  EmptyTaskDefinitionBuilder,
  NewTaskDefinitionBuilder,
  TaskOverrideDefinitionBuilder,
} from "./types/tasks.js";

import { buildGlobalOptionDefinition } from "./internal/global-options.js";
import {
  EmptyTaskDefinitionBuilderImplementation,
  NewTaskDefinitionBuilderImplementation,
  TaskOverrideDefinitionBuilderImplementation,
} from "./internal/tasks/builders.js";
import { ArgumentType } from "./types/arguments.js";

export type { HardhatUserConfig } from "./types/config.js";

export { ArgumentType } from "./types/arguments.js";

/**
 * Creates a configuration variable, which will be fetched at runtime.
 */
export function configVariable(name: string): ConfigurationVariable {
  return { _type: "ConfigurationVariable", name };
}

/**
 * Creates a builder to define a new task.
 */
export function task(
  id: string | string[],
  description: string = "",
): NewTaskDefinitionBuilder {
  return new NewTaskDefinitionBuilderImplementation(id, description);
}

/**
 * Defines a new empty task.
 */
export function emptyTask(
  id: string | string[],
  description: string,
): EmptyTaskDefinitionBuilder {
  return new EmptyTaskDefinitionBuilderImplementation(id, description);
}

/**
 * Creates a builder to override a task.
 */
export function overrideTask(
  id: string | string[],
): TaskOverrideDefinitionBuilder {
  return new TaskOverrideDefinitionBuilderImplementation(id);
}

/**
 * Defines a global option.
 */
export function globalOption<T extends ArgumentType>(options: {
  name: string;
  description: string;
  type?: T;
  defaultValue: ArgumentTypeToValueType<T>;
}): GlobalOptionDefinition {
  return buildGlobalOptionDefinition(options);
}

/**
 * Defines a global flag.
 */
export function globalFlag(options: {
  name: string;
  description: string;
}): GlobalOptionDefinition {
  return buildGlobalOptionDefinition({
    ...options,
    type: ArgumentType.BOOLEAN,
    defaultValue: false,
  });
}
