import type { ParameterTypeToValueType } from "./types/common.js";
import type { ConfigurationVariable } from "./types/config.js";
import type { GlobalOption } from "./types/global-options.js";
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
import { ParameterType } from "./types/common.js";

export type { HardhatUserConfig } from "./types/config.js";

export { ParameterType } from "./types/common.js";

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
export function globalOption<T extends ParameterType>(options: {
  name: string;
  description: string;
  parameterType?: T;
  defaultValue: ParameterTypeToValueType<T>;
}): GlobalOption {
  return buildGlobalOptionDefinition(options);
}

/**
 * Defines a global flag.
 */
export function globalFlag(options: {
  name: string;
  description: string;
}): GlobalOption {
  return buildGlobalOptionDefinition({
    ...options,
    parameterType: ParameterType.BOOLEAN,
    defaultValue: false,
  });
}
