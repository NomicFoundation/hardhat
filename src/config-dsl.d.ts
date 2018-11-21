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

declare function task<ArgsT extends TaskArguments>(
  name: string,
  description?: string
): ITaskDefinition;
declare function task<ArgsT extends TaskArguments>(
  name: string,
  action: ActionType<ArgsT>
): ITaskDefinition;
declare function task<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
): ITaskDefinition;

declare function internalTask<ArgsT extends TaskArguments>(
  name: string,
  description?: string
): ITaskDefinition;
declare function internalTask<ArgsT extends TaskArguments>(
  name: string,
  action: ActionType<ArgsT>
): ITaskDefinition;
declare function internalTask<ArgsT extends TaskArguments>(
  name: string,
  descriptionOrAction?: string | ActionType<ArgsT>,
  action?: ActionType<ArgsT>
): ITaskDefinition;
