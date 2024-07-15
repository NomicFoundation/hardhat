import type {
  ArgumentType,
  ArgumentValue,
  OptionDefinition,
  PositionalArgumentDefinition,
} from "../../types/arguments.js";

import { HardhatError } from "@ignored/hardhat-vnext-errors";

import {
  isArgumentNameValid,
  isArgumentValueValid,
  RESERVED_ARGUMENT_NAMES,
} from "../arguments.js";

import { formatTaskId } from "./utils.js";

export function validateId(id: string | string[]): void {
  if (id.length === 0) {
    throw new HardhatError(HardhatError.ERRORS.TASK_DEFINITIONS.EMPTY_TASK_ID);
  }
}

export function validateAction(action: unknown): void {
  if (typeof action === "string" && !isValidActionUrl(action)) {
    throw new HardhatError(
      HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_FILE_ACTION,
      {
        action,
      },
    );
  }
}

export function validateOption(
  optionDefinition: OptionDefinition,
  usedNames: Set<string>,
  taskId: string | string[],
): void {
  validateArgumentName(optionDefinition.name);

  if (usedNames.has(optionDefinition.name)) {
    throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
      name: optionDefinition.name,
    });
  }

  validateArgumentValue({
    name: "defaultValue",
    value: optionDefinition.defaultValue,
    expectedType: optionDefinition.type,
    taskId: formatTaskId(taskId),
  });

  usedNames.add(optionDefinition.name);
}

export function validatePositionalArgument(
  positionalArgDef: PositionalArgumentDefinition,
  usedNames: Set<string>,
  taskId: string | string[],
  lastArg?: PositionalArgumentDefinition,
): void {
  validateArgumentName(positionalArgDef.name);

  if (usedNames.has(positionalArgDef.name)) {
    throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.DUPLICATED_NAME, {
      name: positionalArgDef.name,
    });
  }

  if (positionalArgDef.defaultValue !== undefined) {
    validateArgumentValue({
      name: "defaultValue",
      value: positionalArgDef.defaultValue,
      isVariadic: positionalArgDef.isVariadic,
      expectedType: positionalArgDef.type,
      taskId: formatTaskId(taskId),
    });
  }

  if (lastArg !== undefined && lastArg.isVariadic) {
    throw new HardhatError(
      HardhatError.ERRORS.TASK_DEFINITIONS.POSITIONAL_ARG_AFTER_VARIADIC,
      {
        name: positionalArgDef.name,
      },
    );
  }

  if (
    lastArg !== undefined &&
    lastArg.defaultValue !== undefined &&
    positionalArgDef.defaultValue === undefined
  ) {
    throw new HardhatError(
      HardhatError.ERRORS.TASK_DEFINITIONS.REQUIRED_ARG_AFTER_OPTIONAL,
      {
        name: positionalArgDef.name,
      },
    );
  }

  usedNames.add(positionalArgDef.name);
}

const FILE_PROTOCOL_PATTERN = /^file:\/\/.+/;

function isValidActionUrl(action: string): boolean {
  return FILE_PROTOCOL_PATTERN.test(action);
}

function validateArgumentName(name: string): void {
  if (!isArgumentNameValid(name)) {
    throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.INVALID_NAME, {
      name,
    });
  }

  if (RESERVED_ARGUMENT_NAMES.has(name)) {
    throw new HardhatError(HardhatError.ERRORS.ARGUMENTS.RESERVED_NAME, {
      name,
    });
  }
}

function validateArgumentValue({
  name,
  expectedType,
  isVariadic = false,
  value,
  taskId,
}: {
  name: string;
  expectedType: ArgumentType;
  isVariadic?: boolean;
  value: ArgumentValue | ArgumentValue[];
  taskId: string | string[];
}): void {
  if (!isArgumentValueValid(expectedType, value, isVariadic)) {
    throw new HardhatError(
      HardhatError.ERRORS.TASK_DEFINITIONS.INVALID_VALUE_FOR_TYPE,
      {
        value,
        name,
        type: expectedType,
        task: formatTaskId(taskId),
      },
    );
  }
}
