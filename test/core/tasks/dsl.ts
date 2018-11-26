import { assert, expect } from "chai";

import { TaskArguments, TasksMap } from "../../types";
import { ArgumentsParser } from "../../../src/cli/ArgumentsParser";
import {
  BuidlerArguments,
  BUIDLER_PARAM_DEFINITIONS
} from "../../../src/core/params/buidler-params";
import {
  BuidlerError,
  ERRORS,
  ErrorDescription
} from "../../../src/core/errors";
import {
  ITaskDefinition,
  TaskDefinition
} from "../../../src/core/tasks/TaskDefinition";
import { string, int } from "../../../src/core/argumentTypes";
import { TasksDSL } from "../../../src/core/tasks/dsl";

function assertCorrectError(f: () => any, error: ErrorDescription) {
  expect(f)
    .to.throw(BuidlerError)
    .with.property("number", error.number);
}

describe("TasksDSL", () => {
  let dsl: TasksDSL;
  beforeEach(() => {
    dsl = new TasksDSL();
  });

  it("should add a task", () => {
    const taskName = "compile"
    const description = "compiler task description"
    const action = async () => {};

    const task = dsl.task(taskName, description, action);
    
    assert.equal(task.name, taskName)
    assert.equal(task.description, description)
    assert.equal(task.action, action)
    assert.isFalse(task.isInternal)
    
  });

  it("should add an internal task", () => {
    const action = async () => {};
    const task = dsl.internalTask("compile", "compiler task description", action);
    assert.isTrue(task.isInternal)
  });

  it("should add a task without description", () => {
    const action = async () => {};
    const task = dsl.task("compile", action);
    assert.isUndefined(task.description)
    assert.equal(task.action, action)
  });

  it("should add a task without action", () => {
    const action = async () => {};
    const task = dsl.task("compile", "a description");
    assert.isUndefined(task.action)
    assert.isDefined(task.description)
  });

  it("should overload task", () => {
    const action = async () => {};

    const builtin = dsl.task("compile", "built-in", action);
    let tasks = dsl.getTaskDefinitions();
    assert.equal(tasks["compile"], builtin)
    
    const custom = dsl.task("compile", "custom", action);
    tasks = dsl.getTaskDefinitions();
    assert.equal(tasks["compile"], custom)
  });

  it("should return added tasks", () => {
    const task = dsl.task("compile", "built-in");
    let tasks = dsl.getTaskDefinitions();
    assert.deepEqual(tasks, {compile: task})
  });


});
