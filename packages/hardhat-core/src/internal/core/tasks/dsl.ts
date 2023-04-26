import {
  ActionType,
  ScopedTasksMap,
  TaskArguments,
  TaskDefinition,
  TaskIdentifier,
  TasksMap,
} from "../../../types";
import { HardhatError } from "../errors";
import { ERRORS } from "../errors-list";

import {
  OverriddenTaskDefinition,
  SimpleTaskDefinition,
} from "./task-definitions";
import { parseTaskIdentifier } from "./util";

/**
 * This class defines the DSL used in Hardhat config files
 * for creating and overriding tasks.
 */
export class TasksDSL {
  public readonly internalTask = this.subtask;

  private readonly _tasks: TasksMap = {};
  private readonly _scopedTasks: ScopedTasksMap = {};

  /**
   * Creates a task, overriding any previous task with the same name.
   *
   * @remarks The action must await every async call made within it.
   *
   * @param taskIdentifier The task's identifier.
   * @param description The task's description.
   * @param action The task's action.
   * @returns A task definition.
   */
  public task<TaskArgumentsT extends TaskArguments>(
    taskIdentifier: TaskIdentifier,
    description?: string,
    action?: ActionType<TaskArgumentsT>
  ): TaskDefinition;

  /**
   * Creates a task without description, overriding any previous task
   * with the same name.
   *
   * @remarks The action must await every async call made within it.
   *
   * @param taskIdentifier The task's identifier.
   * @param action The task's action.
   *
   * @returns A task definition.
   */
  public task<TaskArgumentsT extends TaskArguments>(
    taskIdentifier: TaskIdentifier,
    action: ActionType<TaskArgumentsT>
  ): TaskDefinition;

  public task<TaskArgumentsT extends TaskArguments>(
    taskIdentifier: TaskIdentifier,
    descriptionOrAction?: string | ActionType<TaskArgumentsT>,
    action?: ActionType<TaskArgumentsT>
  ): TaskDefinition {
    return this._addTask(taskIdentifier, descriptionOrAction, action, false);
  }

  /**
   * Creates a subtask, overriding any previous task with the same name.
   *
   * @remarks The subtasks won't be displayed in the CLI help messages.
   * @remarks The action must await every async call made within it.
   *
   * @param taskIdentifier The task's identifier.
   * @param description The task's description.
   * @param action The task's action.
   * @returns A task definition.
   */
  public subtask<TaskArgumentsT extends TaskArguments>(
    taskIdentifier: TaskIdentifier,
    description?: string,
    action?: ActionType<TaskArgumentsT>
  ): TaskDefinition;

  /**
   * Creates a subtask without description, overriding any previous
   * task with the same name.
   *
   * @remarks The subtasks won't be displayed in the CLI help messages.
   * @remarks The action must await every async call made within it.
   *
   * @param taskIdentifier The task's identifier.
   * @param action The task's action.
   * @returns A task definition.
   */
  public subtask<TaskArgumentsT extends TaskArguments>(
    taskIdentifier: TaskIdentifier,
    action: ActionType<TaskArgumentsT>
  ): TaskDefinition;
  public subtask<TaskArgumentsT extends TaskArguments>(
    taskIdentifier: TaskIdentifier,
    descriptionOrAction?: string | ActionType<TaskArgumentsT>,
    action?: ActionType<TaskArgumentsT>
  ): TaskDefinition {
    return this._addTask(taskIdentifier, descriptionOrAction, action, true);
  }

  /**
   * Retrieves the task definitions.
   *
   * @returns The tasks container.
   */
  public getTaskDefinitions(): TasksMap {
    return this._tasks;
  }

  /**
   * Retrieves the scoped task definitions.
   *
   * @returns The scoped tasks container.
   */
  public getScopedTaskDefinitions(): ScopedTasksMap {
    return this._scopedTasks;
  }

  public getTaskDefinition(
    scope: string | undefined,
    name: string
  ): TaskDefinition | undefined {
    if (scope === undefined) {
      return this._tasks[name];
    } else {
      return this._scopedTasks[scope]?.[name];
    }
  }

  private _addTask<TaskArgumentsT extends TaskArguments>(
    taskIdentifier: TaskIdentifier,
    descriptionOrAction?: string | ActionType<TaskArgumentsT>,
    action?: ActionType<TaskArgumentsT>,
    isSubtask?: boolean
  ) {
    const { name, scope } = parseTaskIdentifier(taskIdentifier);
    const parentTaskDefinition = this.getTaskDefinition(scope, name);

    this._checkClash(name, scope);

    let taskDefinition: TaskDefinition;

    if (parentTaskDefinition !== undefined) {
      taskDefinition = new OverriddenTaskDefinition(
        parentTaskDefinition,
        isSubtask
      );
    } else {
      taskDefinition = new SimpleTaskDefinition(
        taskIdentifier,
        isSubtask,
        (oldScope, newScope) => {
          this._moveTaskToNewScope(name, oldScope, newScope);
        }
      );
    }

    if (descriptionOrAction instanceof Function) {
      action = descriptionOrAction;
      descriptionOrAction = undefined;
    }

    if (descriptionOrAction !== undefined) {
      taskDefinition.setDescription(descriptionOrAction);
    }

    if (action !== undefined) {
      taskDefinition.setAction(action);
    }

    if (scope === undefined) {
      this._tasks[name] = taskDefinition;
    } else {
      this._scopedTasks[scope] = this._scopedTasks[scope] ?? {};
      this._scopedTasks[scope]![name] = taskDefinition;
    }

    return taskDefinition;
  }

  private _moveTaskToNewScope(
    taskName: string,
    oldScope: string | undefined,
    newScope: string
  ): void {
    let definition;
    if (oldScope === undefined) {
      definition = this._tasks[taskName];
      delete this._tasks[taskName];
    } else {
      definition = this._scopedTasks[oldScope]![taskName];
      delete this._scopedTasks[oldScope]![taskName];
    }

    this._scopedTasks[newScope] = this._scopedTasks[newScope] ?? {};
    this._scopedTasks[newScope]![taskName] = definition;
  }

  private _checkClash(taskName: string, scopeName: string | undefined): void {
    if (this._scopedTasks[taskName] !== undefined) {
      throw new HardhatError(ERRORS.TASK_DEFINITIONS.SCOPE_TASK_CLASH, {
        taskName,
      });
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (scopeName !== undefined && this._tasks[scopeName]) {
      throw new HardhatError(ERRORS.TASK_DEFINITIONS.TASK_SCOPE_CLASH, {
        taskName,
        scopeName,
      });
    }
  }
}
