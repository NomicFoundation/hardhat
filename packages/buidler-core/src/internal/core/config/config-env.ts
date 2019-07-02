import {
  ActionType,
  ConfigExtender,
  ConfigurableTaskDefinition,
  EnvironmentExtender,
  TaskArguments
} from "../../../types";
import { BuidlerContext } from "../../context";
import * as argumentTypes from "../params/argumentTypes";
import { usePlugin as usePluginImplementation } from "../plugins";

export function task<ArgsT extends TaskArguments>(
  name: string,
  description?: string,
  action?: ActionType<ArgsT>
): ConfigurableTaskDefinition;

export function task<ArgsT extends TaskArguments>(
  name: string,
  action: ActionType<ArgsT>
): ConfigurableTaskDefinition;

export function task<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
): ConfigurableTaskDefinition {
  const ctx = BuidlerContext.getBuidlerContext();
  const dsl = ctx.tasksDSL;

  if (descriptionOrAction === undefined) {
    return dsl.task(name);
  }

  if (typeof descriptionOrAction !== "string") {
    return dsl.task(name, descriptionOrAction);
  }

  return dsl.task(name, descriptionOrAction, action);
}

export function internalTask<ArgsT extends TaskArguments>(
  name: string,
  description?: string,
  action?: ActionType<ArgsT>
): ConfigurableTaskDefinition;

export function internalTask<ArgsT extends TaskArguments>(
  name: string,
  action: ActionType<ArgsT>
): ConfigurableTaskDefinition;

export function internalTask<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
): ConfigurableTaskDefinition {
  const ctx = BuidlerContext.getBuidlerContext();
  const dsl = ctx.tasksDSL;

  if (descriptionOrAction === undefined) {
    return dsl.internalTask(name);
  }

  if (typeof descriptionOrAction !== "string") {
    return dsl.internalTask(name, descriptionOrAction);
  }

  return dsl.internalTask(name, descriptionOrAction, action);
}

export const types = argumentTypes;

/**
 * Register an environment extender what will be run after the
 * Buidler Runtime Environment is initialized.
 *
 * @param extender A function that receives the Buidler Runtime
 * Environment.
 */
export function extendEnvironment(extender: EnvironmentExtender) {
  const ctx = BuidlerContext.getBuidlerContext();
  const extenderManager = ctx.extendersManager;
  extenderManager.add(extender);
}

export function extendConfig(extender: ConfigExtender) {
  const ctx = BuidlerContext.getBuidlerContext();
  ctx.configExtenders.push(extender);
}

/**
 * Loads a Buidler plugin
 * @param pluginName The plugin name.
 */
export function usePlugin(pluginName: string) {
  const ctx = BuidlerContext.getBuidlerContext();
  usePluginImplementation(ctx, pluginName);
}
