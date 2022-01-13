"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksDSL = void 0;
const task_definitions_1 = require("./task-definitions");
/**
 * This class defines the DSL used in Hardhat config files
 * for creating and overriding tasks.
 */
class TasksDSL {
    constructor() {
        this.internalTask = this.subtask;
        this._tasks = {};
    }
    task(name, descriptionOrAction, action) {
        return this._addTask(name, descriptionOrAction, action, false);
    }
    subtask(name, descriptionOrAction, action) {
        return this._addTask(name, descriptionOrAction, action, true);
    }
    /**
     * Retrieves the task definitions.
     *
     * @returns The tasks container.
     */
    getTaskDefinitions() {
        return this._tasks;
    }
    _addTask(name, descriptionOrAction, action, isSubtask) {
        const parentTaskDefinition = this._tasks[name];
        let taskDefinition;
        if (parentTaskDefinition !== undefined) {
            taskDefinition = new task_definitions_1.OverriddenTaskDefinition(parentTaskDefinition, isSubtask);
        }
        else {
            taskDefinition = new task_definitions_1.SimpleTaskDefinition(name, isSubtask);
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
        this._tasks[name] = taskDefinition;
        return taskDefinition;
    }
}
exports.TasksDSL = TasksDSL;
//# sourceMappingURL=dsl.js.map