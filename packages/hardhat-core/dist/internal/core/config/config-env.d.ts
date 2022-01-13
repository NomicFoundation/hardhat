import { ActionType, ConfigExtender, ConfigurableTaskDefinition, EnvironmentExtender, ExperimentalHardhatNetworkMessageTraceHook, TaskArguments } from "../../../types";
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
export declare function task<ArgsT extends TaskArguments>(name: string, description?: string, action?: ActionType<ArgsT>): ConfigurableTaskDefinition;
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
export declare function task<ArgsT extends TaskArguments>(name: string, action: ActionType<ArgsT>): ConfigurableTaskDefinition;
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
export declare function subtask<ArgsT extends TaskArguments>(name: string, description?: string, action?: ActionType<ArgsT>): ConfigurableTaskDefinition;
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
export declare function subtask<ArgsT extends TaskArguments>(name: string, action: ActionType<ArgsT>): ConfigurableTaskDefinition;
export declare const internalTask: typeof subtask;
export declare const types: typeof argumentTypes;
/**
 * Register an environment extender what will be run after the
 * Hardhat Runtime Environment is initialized.
 *
 * @param extender A function that receives the Hardhat Runtime
 * Environment.
 */
export declare function extendEnvironment(extender: EnvironmentExtender): void;
export declare function extendConfig(extender: ConfigExtender): void;
export declare function experimentalAddHardhatNetworkMessageTraceHook(hook: ExperimentalHardhatNetworkMessageTraceHook): void;
//# sourceMappingURL=config-env.d.ts.map