import { ActionType, TaskArguments, TaskDefinition, TasksMap } from "../../../types";
/**
 * This class defines the DSL used in Hardhat config files
 * for creating and overriding tasks.
 */
export declare class TasksDSL {
    readonly internalTask: {
        <ArgsT extends unknown>(name: string, description?: string | undefined, action?: ActionType<ArgsT> | undefined): TaskDefinition;
        <ArgsT_1 extends unknown>(name: string, action: ActionType<ArgsT_1>): TaskDefinition;
    };
    private readonly _tasks;
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
    task<ArgsT extends TaskArguments>(name: string, description?: string, action?: ActionType<ArgsT>): TaskDefinition;
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
    task<ArgsT extends TaskArguments>(name: string, action: ActionType<ArgsT>): TaskDefinition;
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
    subtask<ArgsT extends TaskArguments>(name: string, description?: string, action?: ActionType<ArgsT>): TaskDefinition;
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
    subtask<ArgsT extends TaskArguments>(name: string, action: ActionType<ArgsT>): TaskDefinition;
    /**
     * Retrieves the task definitions.
     *
     * @returns The tasks container.
     */
    getTaskDefinitions(): TasksMap;
    private _addTask;
}
//# sourceMappingURL=dsl.d.ts.map