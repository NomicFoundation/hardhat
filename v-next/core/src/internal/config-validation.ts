import type { HardhatUserConfig } from "../config.js";
import type {
  HardhatUserConfigValidationError,
  HookManager,
} from "../types/hooks.js";
import type { HardhatPlugin } from "../types/plugins.js";

import {
  isOptionDefinition,
  isPositionalArgumentDefinition,
  isTaskDefinition,
} from "../type-guards.js";
import {
  ArgumentType,
  type OptionDefinition,
  type PositionalArgumentDefinition,
} from "../types/arguments.js";
import {
  type EmptyTaskDefinition,
  type NewTaskDefinition,
  type TaskDefinition,
  TaskDefinitionType,
  type TaskOverrideDefinition,
} from "../types/tasks.js";

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

function collectValidationErrorsForUserConfig(
  config: HardhatUserConfig,
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  if (config.tasks !== undefined) {
    if (Array.isArray(config.tasks)) {
      validationErrors.push(...validateTasksConfig(config.tasks));
    } else {
      validationErrors.push({
        path: ["tasks"],
        message: "Invalid config: tasks must be an array",
      });
    }
  }

  if (config.plugins !== undefined) {
    if (Array.isArray(config.plugins)) {
      validationErrors.push(...validatePluginsConfig(config.plugins));
    } else {
      validationErrors.push({
        path: ["plugins"],
        message: "Invalid config: plugins must be an array",
      });
    }
  }

  return validationErrors;
}

function validateTasksConfig(
  tasks: TaskDefinition[],
  path: Array<string | number> = [],
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  for (const [index, task] of tasks.entries()) {
    if (!isTaskDefinition(task)) {
      validationErrors.push({
        path: [...path, "tasks", index],
        message: "Invalid config: tasks must be an array of TaskDefinitions",
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
      }
    }
  }

  return validationErrors;
}

function validateEmptyTask(
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
      message: "Invalid config: task id must be an array of strings",
    });
  }

  if (typeof task.description !== "string") {
    validationErrors.push({
      path: [...path, "description"],
      message: "Invalid config: task description must be a string",
    });
  }

  return validationErrors;
}

function validateNewTask(
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
      message: "Invalid config: task id must be an array of strings",
    });
  }

  if (typeof task.description !== "string") {
    validationErrors.push({
      path: [...path, "description"],
      message: "Invalid config: task description must be a string",
    });
  }

  if (typeof task.action !== "function" && typeof task.action !== "string") {
    validationErrors.push({
      path: [...path, "action"],
      message: "Invalid config: task action must be a function or a string",
    });
  }

  if (typeof task.options === "object" && task.options !== null) {
    validationErrors.push(
      ...validateOptions(task.options, [...path, "options"]),
    );
  } else {
    validationErrors.push({
      path: [...path, "options"],
      message: "Invalid config: task options must be an object",
    });
  }

  if (Array.isArray(task.positionalArguments)) {
    validationErrors.push(
      ...validatePositionalArguments(task.positionalArguments, path),
    );
  } else {
    validationErrors.push({
      path: [...path, "positionalArguments"],
      message: "Invalid config: task positionalArguments must be an array",
    });
  }

  return validationErrors;
}

function validateTaskOverride(
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
      message: "Invalid config: task id must be an array of strings",
    });
  }

  if (task.description !== undefined && typeof task.description !== "string") {
    validationErrors.push({
      path: [...path, "description"],
      message: "Invalid config: task description must be a string",
    });
  }

  if (typeof task.action !== "function" && typeof task.action !== "string") {
    validationErrors.push({
      path: [...path, "action"],
      message: "Invalid config: task action must be a function or a string",
    });
  }

  if (typeof task.options === "object" && task.options !== null) {
    validationErrors.push(
      ...validateOptions(task.options, [...path, "options"]),
    );
  } else {
    validationErrors.push({
      path: [...path, "options"],
      message: "Invalid config: task options must be an object",
    });
  }

  return validationErrors;
}

function validateOptions(
  options: Record<string, OptionDefinition>,
  path: Array<string | number>,
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  for (const [name, option] of Object.entries(options)) {
    if (typeof option.name !== "string") {
      validationErrors.push({
        path: [...path, name, "name"],
        message: "Invalid config: option name must be a string",
      });
    }

    if (typeof option.description !== "string") {
      validationErrors.push({
        path: [...path, name, "description"],
        message: "Invalid config: option description must be a string",
      });
    }

    if (!isOptionDefinition(option)) {
      validationErrors.push({
        path: [...path, name, "type"],
        message: "Invalid config: option type must be a valid ArgumentType",
      });
    }

    if (option.defaultValue === undefined) {
      validationErrors.push({
        path: [...path, name, "defaultValue"],
        message: "Invalid config: option defaultValue must be defined",
      });
    } else {
      switch (option.type) {
        case ArgumentType.STRING: {
          if (typeof option.defaultValue !== "string") {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "Invalid config: option defaultValue must be a string",
            });
          }
        }
        case ArgumentType.BOOLEAN: {
          if (typeof option.defaultValue !== "boolean") {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "Invalid config: option defaultValue must be a boolean",
            });
          }
        }
        case ArgumentType.INT: {
          if (typeof option.defaultValue !== "number") {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "Invalid config: option defaultValue must be a number",
            });
          }
        }
        case ArgumentType.BIGINT: {
          if (typeof option.defaultValue !== "bigint") {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "Invalid config: option defaultValue must be a bigint",
            });
          }
        }
        case ArgumentType.FLOAT: {
          if (typeof option.defaultValue !== "number") {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "Invalid config: option defaultValue must be a number",
            });
          }
        }
        case ArgumentType.FILE: {
          if (typeof option.defaultValue !== "string") {
            validationErrors.push({
              path: [...path, name, "defaultValue"],
              message: "Invalid config: option defaultValue must be a string",
            });
          }
        }
      }
    }
  }

  return validationErrors;
}

function validatePositionalArguments(
  positionalArgs: PositionalArgumentDefinition[],
  path: Array<string | number>,
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  for (const [index, arg] of positionalArgs.entries()) {
    if (typeof arg.name !== "string") {
      validationErrors.push({
        path: [...path, "positionalArguments", index, "name"],
        message: "Invalid config: positional argument name must be a string",
      });
    }

    if (typeof arg.description !== "string") {
      validationErrors.push({
        path: [...path, "positionalArguments", index, "description"],
        message:
          "Invalid config: positional argument description must be a string",
      });
    }

    if (!isPositionalArgumentDefinition(arg)) {
      validationErrors.push({
        path: [...path, "positionalArguments", index, "type"],
        message:
          "Invalid config: positional argument type must be a valid ArgumentType",
      });
    }

    if (arg.defaultValue !== undefined) {
      switch (arg.type) {
        case ArgumentType.STRING: {
          if (typeof arg.defaultValue !== "string") {
            validationErrors.push({
              path: [...path, "positionalArguments", index, "defaultValue"],
              message:
                "Invalid config: positional argument defaultValue must be a string",
            });
          }
        }
        case ArgumentType.BOOLEAN: {
          if (typeof arg.defaultValue !== "boolean") {
            validationErrors.push({
              path: [...path, "positionalArguments", index, "defaultValue"],
              message:
                "Invalid config: positional argument defaultValue must be a boolean",
            });
          }
        }
        case ArgumentType.INT: {
          if (typeof arg.defaultValue !== "number") {
            validationErrors.push({
              path: [...path, "positionalArguments", index, "defaultValue"],
              message:
                "Invalid config: positional argument defaultValue must be a number",
            });
          }
        }
        case ArgumentType.BIGINT: {
          if (typeof arg.defaultValue !== "bigint") {
            validationErrors.push({
              path: [...path, "positionalArguments", index, "defaultValue"],
              message:
                "Invalid config: positional argument defaultValue must be a bigint",
            });
          }
        }
        case ArgumentType.FLOAT: {
          if (typeof arg.defaultValue !== "number") {
            validationErrors.push({
              path: [...path, "positionalArguments", index, "defaultValue"],
              message:
                "Invalid config: positional argument defaultValue must be a number",
            });
          }
        }
        case ArgumentType.FILE: {
          if (typeof arg.defaultValue !== "string") {
            validationErrors.push({
              path: [...path, "positionalArguments", index, "defaultValue"],
              message:
                "Invalid config: positional argument defaultValue must be a string",
            });
          }
        }
      }
    }

    if (typeof arg.isVariadic !== "boolean") {
      validationErrors.push({
        path: [...path, "positionalArguments", index, "isVariadic"],
        message:
          "Invalid config: positional argument isVariadic must be a boolean",
      });
    } else if (arg.isVariadic === true && index !== positionalArgs.length - 1) {
      validationErrors.push({
        path: [...path, "positionalArguments", index, "isVariadic"],
        message:
          "Invalid config: variadic positional argument must be the last one",
      });
    }
  }

  return validationErrors;
}

function validatePluginsConfig(
  plugins: HardhatPlugin[],
  path: Array<string | number> = [],
): HardhatUserConfigValidationError[] {
  const validationErrors: HardhatUserConfigValidationError[] = [];

  for (const [index, plugin] of plugins.entries()) {
    if (typeof plugin !== "object" || plugin === null) {
      validationErrors.push({
        path: [...path, "plugins", index],
        message:
          "Invalid config: plugins must be an array of PluginDefinitions",
      });

      continue;
    }

    if (typeof plugin.id !== "string") {
      validationErrors.push({
        path: [...path, "plugins", index, "id"],
        message: "Invalid config: plugin id must be a string",
      });
    }

    if (
      plugin.npmPackage !== undefined &&
      typeof plugin.npmPackage !== "string"
    ) {
      validationErrors.push({
        path: [...path, "plugins", index, "npmPackage"],
        message: "Invalid config: plugin npmPackage must be a string",
      });
    }

    if (plugin.dependencies !== undefined) {
      if (Array.isArray(plugin.dependencies)) {
        for (const [depIndex, dep] of plugin.dependencies.entries()) {
          if (typeof dep !== "function") {
            validationErrors.push({
              path: [...path, "plugins", index, "dependencies", depIndex],
              message:
                "Invalid config: plugin dependencies must be an array of functions",
            });
          }
        }
      } else {
        validationErrors.push({
          path: [...path, "plugins", index, "dependencies"],
          message: "Invalid config: plugin dependencies must be an array",
        });
      }
    }

    if (plugin.hookHandlers !== undefined) {
      if (
        typeof plugin.hookHandlers === "object" &&
        plugin.hookHandlers !== null
      ) {
        for (const [hookName, handler] of Object.entries(plugin.hookHandlers)) {
          if (typeof handler === "function" || typeof handler === "string") {
            continue;
          }

          validationErrors.push({
            path: [...path, "plugins", index, "hookHandlers", hookName],
            message:
              "Invalid config: plugin hookHandlers must be an object of functions or strings",
          });
        }
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
          message: "Invalid config: plugin globalOptions must be an array",
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
          message: "Invalid config: plugin tasks must be an array",
        });
      }
    }
  }

  return validationErrors;
}
