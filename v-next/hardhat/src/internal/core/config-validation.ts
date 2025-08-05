import type {
  HardhatUserConfig,
  ProjectPathsUserConfig,
} from "../../types/config.js";
import type {
  HardhatUserConfigValidationError,
  HookManager,
} from "../../types/hooks.js";
import type { HardhatPlugin } from "../../types/plugins.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { isObject } from "@nomicfoundation/hardhat-utils/lang";

import {
  ArgumentType,
  type OptionDefinition,
  type PositionalArgumentDefinition,
} from "../../types/arguments.js";
import {
  type EmptyTaskDefinition,
  type NewTaskDefinition,
  type TaskDefinition,
  TaskDefinitionType,
  type TaskOverrideDefinition,
} from "../../types/tasks.js";

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
function isTaskDefinition(potential: unknown): potential is TaskDefinition {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    typeof potential.type === "string" &&
    isValidEnumValue(TaskDefinitionType, potential.type)
  );
}

/**
 * Returns true if `potential` is a `PositionalArgumentDefinition`.
 */
function isPositionalArgumentDefinition(
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

export async function validateUserConfig(
  hooks: HookManager,
  config: HardhatUserConfig,
): Promise<HardhatUserConfigValidationError[]> {
  const validationErrors: HardhatUserConfigValidationError[] =
    collectValidationErrorsForUserConfig(config);

  const results = await hooks.runParallelHandlers(
    "config",
    "validateUserConfig",
    [config],
  );

  return [...validationErrors, ...results.flat(1)];
}

export function collectValidationErrorsForUserConfig(
  config: HardhatUserConfig,
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  if (config.paths !== undefined) {
    if (isObject(config.paths)) {
      validationErrors.push(...validatePaths(config.paths));
    } else {
      validationErrors.push({
        path: ["paths"],
        message: "paths must be an object",
      });
    }
  }

  if (config.tasks !== undefined) {
    if (Array.isArray(config.tasks)) {
      validationErrors.push(...validateTasksConfig(config.tasks));
    } else {
      validationErrors.push({
        path: ["tasks"],
        message: "tasks must be an array",
      });
    }
  }

  if (config.plugins !== undefined) {
    if (Array.isArray(config.plugins)) {
      validationErrors.push(...validatePluginsConfig(config.plugins));
    } else {
      validationErrors.push({
        path: ["plugins"],
        message: "plugins must be an array",
      });
    }
  }

  return validationErrors;
}

export function validatePaths(
  paths: ProjectPathsUserConfig,
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  if (paths.cache !== undefined) {
    validationErrors.push(...validatePath(paths.cache, "cache"));
  }

  if (paths.artifacts !== undefined) {
    validationErrors.push(...validatePath(paths.artifacts, "artifacts"));
  }

  if (paths.tests !== undefined) {
    // paths.tests of type TestPathsUserConfig is not validated because it is customizable by the user
    if (!isObject(paths.tests)) {
      validationErrors.push(...validatePath(paths.tests, "tests"));
    }
  }

  if (paths.sources !== undefined) {
    if (Array.isArray(paths.sources)) {
      for (const [index, source] of paths.sources.entries()) {
        validationErrors.push(...validatePath(source, "sources", index));
      }
      // paths.sources of type SourcePathsUserConfig is not validated because it is customizable by the user
    } else if (!isObject(paths.sources)) {
      validationErrors.push(...validatePath(paths.sources, "sources"));
    }
  }

  return validationErrors;
}

function validatePath(
  filePath: unknown,
  pathName: "cache" | "artifacts" | "tests" | "sources",
  index?: number,
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  if (typeof filePath !== "string") {
    const messagePrefix =
      index !== undefined
        ? `paths.${pathName} at index ${index}`
        : `paths.${pathName}`;

    validationErrors.push({
      path:
        index !== undefined ? ["paths", pathName, index] : ["paths", pathName],
      message: `${messagePrefix} must be a string`,
    });
  }

  return validationErrors;
}

export function validateTasksConfig(
  tasks: TaskDefinition[],
  path: Array<string | number> = [],
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  for (const [index, task] of tasks.entries()) {
    if (!isTaskDefinition(task)) {
      validationErrors.push({
        path: [...path, "tasks", index],
        message: "tasks must be an array of TaskDefinitions",
      });

      continue;
    }

    switch (task.type) {
      case TaskDefinitionType.EMPTY_TASK: {
        validationErrors.push(
          ...validateEmptyTask(task, [...path, "tasks", index]),
        );
        break;
      }
      case TaskDefinitionType.NEW_TASK: {
        validationErrors.push(
          ...validateNewTask(task, [...path, "tasks", index]),
        );
        break;
      }
      case TaskDefinitionType.TASK_OVERRIDE: {
        validationErrors.push(
          ...validateTaskOverride(task, [...path, "tasks", index]),
        );
        break;
      }
    }
  }

  return validationErrors;
}

export function validateEmptyTask(
  task: EmptyTaskDefinition,
  path: Array<string | number>,
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  if (
    !Array.isArray(task.id) ||
    !task.id.every((id) => typeof id === "string")
  ) {
    validationErrors.push({
      path: [...path, "id"],
      message: "task id must be an array of strings",
    });
  }

  if (typeof task.description !== "string") {
    validationErrors.push({
      path: [...path, "description"],
      message: "task description must be a string",
    });
  }

  return validationErrors;
}

export function validateNewTask(
  task: NewTaskDefinition,
  path: Array<string | number>,
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  if (
    !Array.isArray(task.id) ||
    !task.id.every((id) => typeof id === "string")
  ) {
    validationErrors.push({
      path: [...path, "id"],
      message: "task id must be an array of strings",
    });
  }

  if (typeof task.description !== "string") {
    validationErrors.push({
      path: [...path, "description"],
      message: "task description must be a string",
    });
  }

  if (typeof task.action !== "function" && typeof task.action !== "string") {
    validationErrors.push({
      path: [...path, "action"],
      message: "task action must be a function or a string",
    });
  }

  if (isObject(task.options)) {
    validationErrors.push(
      ...validateOptions(task.options, [...path, "options"]),
    );
  } else {
    validationErrors.push({
      path: [...path, "options"],
      message: "task options must be an object",
    });
  }

  if (Array.isArray(task.positionalArguments)) {
    validationErrors.push(
      ...validatePositionalArguments(task.positionalArguments, path),
    );
  } else {
    validationErrors.push({
      path: [...path, "positionalArguments"],
      message: "task positionalArguments must be an array",
    });
  }

  return validationErrors;
}

export function validateTaskOverride(
  task: TaskOverrideDefinition,
  path: Array<string | number>,
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  if (
    !Array.isArray(task.id) ||
    !task.id.every((id) => typeof id === "string")
  ) {
    validationErrors.push({
      path: [...path, "id"],
      message: "task id must be an array of strings",
    });
  }

  if (task.description !== undefined && typeof task.description !== "string") {
    validationErrors.push({
      path: [...path, "description"],
      message: "task description must be a string",
    });
  }

  if (typeof task.action !== "function" && typeof task.action !== "string") {
    validationErrors.push({
      path: [...path, "action"],
      message: "task action must be a function or a string",
    });
  }

  if (isObject(task.options)) {
    validationErrors.push(
      ...validateOptions(task.options, [...path, "options"]),
    );
  } else {
    validationErrors.push({
      path: [...path, "options"],
      message: "task options must be an object",
    });
  }

  return validationErrors;
}

export function validateOptions(
  options: Record<string, OptionDefinition>,
  path: Array<string | number>,
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  for (const [name, option] of Object.entries(options)) {
    if (typeof option.name !== "string") {
      validationErrors.push({
        path: [...path, name, "name"],
        message: "option name must be a string",
      });
    }

    if (typeof option.description !== "string") {
      validationErrors.push({
        path: [...path, name, "description"],
        message: "option description must be a string",
      });
    }

    if (ArgumentType[option.type] === undefined) {
      validationErrors.push({
        path: [...path, name, "type"],
        message: "option type must be a valid ArgumentType",
      });
    }

    if (
      option.type !== ArgumentType.STRING_WITHOUT_DEFAULT &&
      option.type !== ArgumentType.FILE_WITHOUT_DEFAULT &&
      option.type !== ArgumentType.FLOAT_WITHOUT_DEFAULT &&
      option.defaultValue === undefined
    ) {
      validationErrors.push({
        path: [...path, name, "defaultValue"],
        message: "option defaultValue must be defined",
      });
    } else {
      switch (option.type) {
        case ArgumentType.STRING:
        case ArgumentType.FILE: {
          if (typeof option.defaultValue !== "string") {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "option defaultValue must be a string",
            });
          }
          break;
        }
        case ArgumentType.FILE_WITHOUT_DEFAULT:
        case ArgumentType.STRING_WITHOUT_DEFAULT: {
          if (
            typeof option.defaultValue !== "string" &&
            option.defaultValue !== undefined
          ) {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "option defaultValue must be a string or undefined",
            });
          }
          break;
        }
        case ArgumentType.FLAG:
        case ArgumentType.BOOLEAN: {
          if (typeof option.defaultValue !== "boolean") {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "option defaultValue must be a boolean",
            });
          }
          break;
        }
        case ArgumentType.FLOAT_WITHOUT_DEFAULT: {
          if (
            typeof option.defaultValue !== "number" &&
            option.defaultValue !== undefined
          ) {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "option defaultValue must be a number or undefined",
            });
          }
          break;
        }
        case ArgumentType.INT:
        case ArgumentType.FLOAT: {
          if (typeof option.defaultValue !== "number") {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "option defaultValue must be a number",
            });
          }
          break;
        }
        case ArgumentType.LEVEL:
          if (
            typeof option.defaultValue !== "number" ||
            option.defaultValue < 0
          ) {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "option defaultValue must be a non-negative number",
            });
          }
          break;
        case ArgumentType.BIGINT: {
          if (typeof option.defaultValue !== "bigint") {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "option defaultValue must be a bigint",
            });
          }
          break;
        }
      }
    }
  }

  return validationErrors;
}

export function validatePositionalArguments(
  positionalArgs: PositionalArgumentDefinition[],
  path: Array<string | number>,
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  for (const [index, arg] of positionalArgs.entries()) {
    if (typeof arg.name !== "string") {
      validationErrors.push({
        path: [...path, "positionalArguments", index, "name"],
        message: "positional argument name must be a string",
      });
    }

    if (typeof arg.description !== "string") {
      validationErrors.push({
        path: [...path, "positionalArguments", index, "description"],
        message: "positional argument description must be a string",
      });
    }

    if (!isPositionalArgumentDefinition(arg)) {
      validationErrors.push({
        path: [...path, "positionalArguments", index, "type"],
        message: "positional argument type must be a valid ArgumentType",
      });
    }

    if (arg.defaultValue !== undefined) {
      switch (arg.type) {
        case ArgumentType.STRING_WITHOUT_DEFAULT:
        case ArgumentType.FILE_WITHOUT_DEFAULT:
        case ArgumentType.STRING:
        case ArgumentType.FILE: {
          if (
            typeof arg.defaultValue !== "string" &&
            (!Array.isArray(arg.defaultValue) ||
              arg.defaultValue.some((v) => typeof v !== "string"))
          ) {
            validationErrors.push({
              path: [...path, "positionalArguments", index, "defaultValue"],
              message:
                "positional argument defaultValue must be a string or an array of strings",
            });
          }

          break;
        }
        case ArgumentType.BOOLEAN: {
          if (
            typeof arg.defaultValue !== "boolean" &&
            (!Array.isArray(arg.defaultValue) ||
              arg.defaultValue.some((v) => typeof v !== "boolean"))
          ) {
            validationErrors.push({
              path: [...path, "positionalArguments", index, "defaultValue"],
              message:
                "positional argument defaultValue must be a boolean or an array of booleans",
            });
          }

          break;
        }
        case ArgumentType.FLOAT_WITHOUT_DEFAULT:
        case ArgumentType.INT:
        case ArgumentType.FLOAT: {
          if (
            typeof arg.defaultValue !== "number" &&
            (!Array.isArray(arg.defaultValue) ||
              arg.defaultValue.some((v) => typeof v !== "number"))
          ) {
            validationErrors.push({
              path: [...path, "positionalArguments", index, "defaultValue"],
              message:
                "positional argument defaultValue must be a number or an array of numbers",
            });
          }

          break;
        }
        case ArgumentType.BIGINT: {
          if (
            typeof arg.defaultValue !== "bigint" &&
            (!Array.isArray(arg.defaultValue) ||
              arg.defaultValue.some((v) => typeof v !== "bigint"))
          ) {
            validationErrors.push({
              path: [...path, "positionalArguments", index, "defaultValue"],
              message:
                "positional argument defaultValue must be a bigint or an array of bigints",
            });
          }

          break;
        }
        case ArgumentType.FLAG:
        case ArgumentType.LEVEL:
          throw new HardhatError(
            HardhatError.ERRORS.CORE.INTERNAL.ASSERTION_ERROR,
            {
              message: `Argument type ${arg.type} cannot be used as a positional argument`,
            },
          );
      }
    }

    if (typeof arg.isVariadic !== "boolean") {
      validationErrors.push({
        path: [...path, "positionalArguments", index, "isVariadic"],
        message: "positional argument isVariadic must be a boolean",
      });
    } else if (arg.isVariadic === true && index !== positionalArgs.length - 1) {
      validationErrors.push({
        path: [...path, "positionalArguments", index, "isVariadic"],
        message: "variadic positional argument must be the last one",
      });
    }
  }

  return validationErrors;
}

export function validatePluginsConfig(
  plugins: HardhatPlugin[],
  path: Array<string | number> = [],
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  for (const [index, plugin] of plugins.entries()) {
    if (typeof plugin !== "object" || plugin === null) {
      validationErrors.push({
        path: [...path, "plugins", index],
        message: "plugins must be an array of PluginDefinitions",
      });

      continue;
    }

    if (typeof plugin.id !== "string") {
      validationErrors.push({
        path: [...path, "plugins", index, "id"],
        message: "plugin id must be a string",
      });
    }

    if (
      plugin.npmPackage !== undefined &&
      typeof plugin.npmPackage !== "string"
    ) {
      validationErrors.push({
        path: [...path, "plugins", index, "npmPackage"],
        message: "plugin npmPackage must be a string",
      });
    }

    if (plugin.dependencies !== undefined) {
      if (Array.isArray(plugin.dependencies)) {
        for (const [depIndex, dep] of plugin.dependencies.entries()) {
          if (typeof dep !== "function") {
            validationErrors.push({
              path: [...path, "plugins", index, "dependencies", depIndex],
              message: "plugin dependencies must be an array of functions",
            });
          }
        }
      } else {
        validationErrors.push({
          path: [...path, "plugins", index, "dependencies"],
          message: "plugin dependencies must be an array",
        });
      }
    }

    if (plugin.hookHandlers !== undefined) {
      if (
        typeof plugin.hookHandlers === "object" &&
        plugin.hookHandlers !== null
      ) {
        for (const [hookName, handler] of Object.entries(plugin.hookHandlers)) {
          if (typeof handler !== "function" && typeof handler !== "string") {
            validationErrors.push({
              path: [...path, "plugins", index, "hookHandlers", hookName],
              message:
                "plugin hookHandlers must be an object of functions or strings",
            });
          }
        }
      } else {
        validationErrors.push({
          path: [...path, "plugins", index, "hookHandlers"],
          message: "plugin hookHandlers must be an object",
        });
      }
    }

    if (plugin.globalOptions !== undefined) {
      if (Array.isArray(plugin.globalOptions)) {
        validationErrors.push(
          ...validateOptions(
            Object.fromEntries(plugin.globalOptions.entries()),
            [...path, "plugins", index, "globalOptions"],
          ),
        );
      } else {
        validationErrors.push({
          path: [...path, "plugins", index, "globalOptions"],
          message: "plugin globalOptions must be an array",
        });
      }
    }

    if (plugin.tasks !== undefined) {
      if (Array.isArray(plugin.tasks)) {
        validationErrors.push(
          ...validateTasksConfig(plugin.tasks, [...path, "plugins", index]),
        );
      } else {
        validationErrors.push({
          path: [...path, "plugins", index, "tasks"],
          message: "plugin tasks must be an array",
        });
      }
    }
  }

  return validationErrors;
}
