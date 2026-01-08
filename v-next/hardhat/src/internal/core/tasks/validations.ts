import type {
  ArgumentType,
  ArgumentValue,
  OptionDefinition,
  PositionalArgumentDefinition,
} from "../../../types/arguments.js";
import type {
  LazyActionObject,
  NewTaskActionFunction,
  TaskArguments,
  TaskOverrideActionFunction,
} from "../../../types/tasks.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import {
  validateArgumentName,
  validateArgumentShortName,
  validateArgumentValue,
} from "../arguments.js";

import { formatTaskId } from "./utils.js";

export function validateId(id: string | string[]): void {
  if (id.length === 0) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS.EMPTY_TASK_ID,
    );
  }
}

export function validateAction(
  action:
    | LazyActionObject<NewTaskActionFunction<TaskArguments>>
    | LazyActionObject<TaskOverrideActionFunction<TaskArguments>>
    | undefined,
  inlineAction:
    | NewTaskActionFunction<TaskArguments>
    | TaskOverrideActionFunction<TaskArguments>
    | undefined,
  taskId: string[],
  isPlugin: boolean,
): void {
  if (action !== undefined && inlineAction !== undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS.ACTION_AND_INLINE_ACTION_CONFLICT,
      { task: formatTaskId(taskId) },
    );
  }

  if (isPlugin && inlineAction !== undefined) {
    // Inline actions cannot be used in plugins, as they are only allowed in user tasks
    throw new HardhatError(
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INLINE_ACTION_CANNOT_BE_USED_IN_PLUGINS,
      { task: formatTaskId(taskId) },
    );
  }
}

export function validateOption(
  { name, shortName, type, defaultValue }: OptionDefinition,
  usedNames: Set<string>,
  taskId: string | string[],
): void {
  validateArgumentName(name);

  if (usedNames.has(name)) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME, {
      name,
    });
  }

  validateTaskArgumentValue("defaultValue", type, defaultValue, false, taskId);

  if (shortName !== undefined) {
    validateArgumentShortName(shortName);

    if (usedNames.has(shortName)) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME,
        {
          name: shortName,
        },
      );
    }
  }

  usedNames.add(name);

  if (shortName !== undefined) {
    usedNames.add(shortName);
  }
}

export function validatePositionalArgument(
  { name, type, defaultValue, isVariadic }: PositionalArgumentDefinition,
  usedNames: Set<string>,
  taskId: string | string[],
  lastArg?: PositionalArgumentDefinition,
): void {
  validateArgumentName(name);

  if (usedNames.has(name)) {
    throw new HardhatError(HardhatError.ERRORS.CORE.ARGUMENTS.DUPLICATED_NAME, {
      name,
    });
  }

  if (defaultValue !== undefined) {
    validateTaskArgumentValue(
      "defaultValue",
      type,
      defaultValue,
      isVariadic,
      taskId,
    );
  }

  if (lastArg !== undefined && lastArg.isVariadic) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS.POSITIONAL_ARG_AFTER_VARIADIC,
      {
        name,
      },
    );
  }

  if (
    lastArg !== undefined &&
    lastArg.defaultValue !== undefined &&
    defaultValue === undefined
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.TASK_DEFINITIONS.REQUIRED_ARG_AFTER_OPTIONAL,
      {
        name,
      },
    );
  }

  usedNames.add(name);
}

export function validateTaskArgumentValue(
  name: string,
  expectedType: ArgumentType,
  value: ArgumentValue | ArgumentValue[],
  isVariadic: boolean,
  taskId: string | string[],
): void {
  try {
    validateArgumentValue(name, expectedType, value, isVariadic);
  } catch (error) {
    if (
      HardhatError.isHardhatError(
        error,
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      )
    ) {
      throw new HardhatError(
        HardhatError.ERRORS.CORE.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
        {
          name,
          type: expectedType,
          value,
          task: formatTaskId(taskId),
        },
      );
    }

    throw error;
  }
}
