import type {
  ArgumentTypeToValueType,
  OptionDefinition,
} from "../../types/arguments.js";
import type { ConfigurationVariable } from "../../types/config.js";
import type {
  EmptyTaskDefinitionBuilder,
  NewTaskDefinitionBuilder,
  TaskOverrideDefinitionBuilder,
} from "../../types/tasks.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ArgumentType } from "../../types/arguments.js";

import { CONFIGURATION_VARIABLE_MARKER } from "./configuration-variables.js";
import { buildGlobalOptionDefinition } from "./global-options.js";
import {
  EmptyTaskDefinitionBuilderImplementation,
  NewTaskDefinitionBuilderImplementation,
  TaskOverrideDefinitionBuilderImplementation,
} from "./tasks/builders.js";

/**
 * Creates a configuration variable, which will be fetched at runtime.
 */
export function configVariable(
  name: string,
  format: string = CONFIGURATION_VARIABLE_MARKER,
): ConfigurationVariable {
  if (!format.includes(CONFIGURATION_VARIABLE_MARKER)) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.GENERAL.CONFIG_VARIABLE_FORMAT_MUST_INCLUDE_VARIABLE,
      { format, marker: CONFIGURATION_VARIABLE_MARKER },
    );
  }
  return { _type: "ConfigurationVariable", name, format };
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
  shortName?: string;
  description: string;
  type?: T;
  defaultValue: ArgumentTypeToValueType<T>;
}): OptionDefinition {
  return buildGlobalOptionDefinition(options);
}

/**
 * Defines a global flag.
 */
export function globalFlag(options: {
  name: string;
  shortName?: string;
  description: string;
}): OptionDefinition {
  return buildGlobalOptionDefinition({
    ...options,
    type: ArgumentType.FLAG,
    defaultValue: false,
  });
}

/**
 * Defines a global level.
 */
export function globalLevel(options: {
  name: string;
  shortName?: string;
  description: string;
  defaultValue?: number;
}): OptionDefinition {
  return buildGlobalOptionDefinition({
    ...options,
    type: ArgumentType.LEVEL,
    defaultValue: options.defaultValue ?? 0,
  });
}
