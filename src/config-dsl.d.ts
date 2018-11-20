import * as argumentTypes from "./core/argumentTypes";
import { extendEnvironment as extendEnvironmentDsl } from "./core/env/extensions";
import { ITaskDefinition } from "./core/tasks/TaskDefinition";
import { ActionType, TaskArguments } from "./types";

// This should declare everything that gets injected into global before loading
// the config.

// This file shouldn't exist in the future, as these things should be
// require-able

declare const Web3: any;
declare const types: typeof argumentTypes;
declare const extendEnvironment: typeof extendEnvironmentDsl;

declare function task(name: string, description?: string): ITaskDefinition;
declare function task(
  name: string,
  action: ActionType<TaskArguments>
): ITaskDefinition;
declare function task(
  name: string,
  descriptionOrAction?: string | ActionType<TaskArguments>,
  action?: ActionType<TaskArguments>
): ITaskDefinition;

export function internalTask(
  name: string,
  description?: string
): ITaskDefinition;
export function internalTask(
  name: string,
  action: ActionType<TaskArguments>
): ITaskDefinition;
export function internalTask(
  name: string,
  descriptionOrAction?: string | ActionType<TaskArguments>,
  action?: ActionType<TaskArguments>
): ITaskDefinition;
