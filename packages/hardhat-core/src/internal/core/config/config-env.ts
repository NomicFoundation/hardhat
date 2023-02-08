import {
  ActionType,
  ConfigExtender,
  ConfigurableTaskDefinition,
  EnvironmentExtender,
  ExperimentalHardhatNetworkMessageTraceHook,
  TaskArguments,
} from "../../../types";
import { HardhatContext } from "../../context";
import * as argumentTypes from "../params/argumentTypes";

/**
 * Creates a task, overriding any previous task with the same name.
 *
 * @remarks The action must await every async call made within it.
 *
 * @param name The task's name.
 * @param description The task's description.
 * @param action The task's action.
 * @returns A task definition.
 */
export function task<TaskArgumentsT extends TaskArguments>(
  name: string,
  description?: string,
  action?: ActionType<TaskArgumentsT>
): ConfigurableTaskDefinition;

/**
 * Creates a task without description, overriding any previous task
 * with the same name.
 *
 * @remarks The action must await every async call made within it.
 *
 * @param name The task's name.
 * @param action The task's action.
 *
 * @returns A task definition.
 */
export function task<TaskArgumentsT extends TaskArguments>(
  name: string,
  action: ActionType<TaskArgumentsT>
): ConfigurableTaskDefinition;

export function task<TaskArgumentsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<TaskArgumentsT>,
  action?: ActionType<TaskArgumentsT>
): ConfigurableTaskDefinition {
  const ctx = HardhatContext.getHardhatContext();
  const dsl = ctx.tasksDSL;

  if (descriptionOrAction === undefined) {
    return dsl.task(name);
  }

  if (typeof descriptionOrAction !== "string") {
    return dsl.task(name, descriptionOrAction);
  }

  return dsl.task(name, descriptionOrAction, action);
}

/**
 * Creates a subtask, overriding any previous task with the same name.
 *
 * @remarks The subtasks won't be displayed in the CLI help messages.
 * @remarks The action must await every async call made within it.
 *
 * @param name The task's name.
 * @param description The task's description.
 * @param action The task's action.
 * @returns A task definition.
 */
export function subtask<TaskArgumentsT extends TaskArguments>(
  name: string,
  description?: string,
  action?: ActionType<TaskArgumentsT>
): ConfigurableTaskDefinition;

/**
 * Creates a subtask without description, overriding any previous
 * task with the same name.
 *
 * @remarks The subtasks won't be displayed in the CLI help messages.
 * @remarks The action must await every async call made within it.
 *
 * @param name The task's name.
 * @param action The task's action.
 * @returns A task definition.
 */
export function subtask<TaskArgumentsT extends TaskArguments>(
  name: string,
  action: ActionType<TaskArgumentsT>
): ConfigurableTaskDefinition;

export function subtask<TaskArgumentsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<TaskArgumentsT>,
  action?: ActionType<TaskArgumentsT>
): ConfigurableTaskDefinition {
  const ctx = HardhatContext.getHardhatContext();
  const dsl = ctx.tasksDSL;

  if (descriptionOrAction === undefined) {
    return dsl.subtask(name);
  }

  if (typeof descriptionOrAction !== "string") {
    return dsl.subtask(name, descriptionOrAction);
  }

  return dsl.subtask(name, descriptionOrAction, action);
}

// Backwards compatibility alias
export const internalTask = subtask;

export const types = argumentTypes;

/**
 * Register an environment extender what will be run after the
 * Hardhat Runtime Environment is initialized.
 *
 * @param extender A function that receives the Hardhat Runtime
 * Environment.
 */
export function extendEnvironment(extender: EnvironmentExtender) {
  const ctx = HardhatContext.getHardhatContext();
  const extenderManager = ctx.extendersManager;
  extenderManager.add(extender);
}

export function extendConfig(extender: ConfigExtender) {
  const ctx = HardhatContext.getHardhatContext();
  ctx.configExtenders.push(extender);
}

// NOTE: This is experimental and will be removed. Please contact our team
// if you are planning to use it.
export function experimentalAddHardhatNetworkMessageTraceHook(
  hook: ExperimentalHardhatNetworkMessageTraceHook
) {
  const ctx = HardhatContext.getHardhatContext();
  ctx.experimentalHardhatNetworkMessageTraceHooks.push(hook);
}
