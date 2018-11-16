import { ITaskDefinition } from "./core/tasks/TaskDefinition";

type ActionType = (
  taskArgs?: any,
  buidlerArgs?: any,
  config?: any
) => Promise<any>;

declare function run(
  task: string,
  taskArgs?: any,
  buidlerArgs?: any,
  config?: any
): any;

declare function task(
  name: string,
  descriptionOrAction?: string | ActionType,
  action?: ActionType,
  isInternal?: boolean
): ITaskDefinition;

declare function internalTask(
  name: string,
  descriptionOrAction?: string | ActionType,
  action?: ActionType
): ITaskDefinition;

declare const config: any;

declare const web3: any;
