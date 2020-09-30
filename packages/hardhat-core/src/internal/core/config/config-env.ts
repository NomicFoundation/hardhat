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

export function subtask<ArgsT extends TaskArguments>(
  name: string,
  description?: string,
  action?: ActionType<ArgsT>
): ConfigurableTaskDefinition;

export function subtask<ArgsT extends TaskArguments>(
  name: string,
  action: ActionType<ArgsT>
): ConfigurableTaskDefinition;

export function subtask<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
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

/**
 * Loads a Hardhat plugin
 * @param pluginName The plugin name.
 */
export function usePlugin(pluginName: string) {
  const ctx = HardhatContext.getHardhatContext();
  usePluginImplementation(ctx, pluginName);
}
