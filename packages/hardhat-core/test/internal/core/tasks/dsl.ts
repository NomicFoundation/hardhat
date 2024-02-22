import { assert } from "chai";

import { ERRORS } from "../../../../src/internal/core/errors-list";
import { TasksDSL } from "../../../../src/internal/core/tasks/dsl";
import {
  expectHardhatError,
  expectHardhatErrorAsync,
} from "../../../helpers/errors";

describe("TasksDSL", () => {
  let dsl: TasksDSL;
  beforeEach(() => {
    dsl = new TasksDSL();
  });

  it("should add a task", () => {
    const taskName = "compile";
    const description = "compiler task description";
    const action = async () => {};

    const task = dsl.task(taskName, description, action);

    assert.strictEqual(task.name, taskName);
    assert.strictEqual(task.description, description);
    assert.strictEqual(task.action, action);
    assert.isFalse(task.isSubtask);
  });

  it("should add a subtask", () => {
    const action = async () => {};
    const task = dsl.subtask("compile", "compiler task description", action);
    assert.isTrue(task.isSubtask);
  });

  it("should add a subtask through the internalTask alias", () => {
    const action = async () => {};
    const task = dsl.internalTask(
      "compile",
      "compiler task description",
      action
    );
    assert.isTrue(task.isSubtask);
  });

  it("should add a task without description", () => {
    const action = async () => {};
    const task = dsl.task("compile", action);
    assert.isUndefined(task.description);
    assert.strictEqual(task.action, action);
  });

  it("should add a task with default action", async () => {
    const task = dsl.task("compile", "a description");
    assert.isDefined(task.description);
    assert.isDefined(task.action);

    const runSuperNop: any = async () => {};
    runSuperNop.isDefined = false;

    await expectHardhatErrorAsync(
      () => task.action({}, {} as any, runSuperNop),
      ERRORS.TASK_DEFINITIONS.ACTION_NOT_SET
    );
  });

  it("should create a scope without a description", () => {
    const scope = dsl.scope("solidity");
    assert.strictEqual(scope.name, "solidity");
    assert.isUndefined(scope.description);
  });

  it("should create a scope with a description", () => {
    const scope = dsl.scope("solidity", "solidity tasks");
    assert.strictEqual(scope.name, "solidity");
    assert.strictEqual(scope.description, "solidity tasks");
  });

  it("should override the description of a scope without description", () => {
    const scope = dsl.scope("solidity");
    assert.strictEqual(scope.name, "solidity");
    assert.isUndefined(scope.description);

    const newScope = dsl.scope("solidity", "solidity tasks");
    assert.strictEqual(newScope.name, "solidity");
    assert.strictEqual(newScope.description, "solidity tasks");
    assert.strictEqual(scope, newScope);
  });

  it("should override the description of a scope with a description", () => {
    const scope = dsl.scope("solidity", "solidity tasks");
    assert.strictEqual(scope.name, "solidity");
    assert.strictEqual(scope.description, "solidity tasks");

    const newScope = dsl.scope("solidity", "solidity tasks 2");
    assert.strictEqual(newScope.name, "solidity");
    assert.strictEqual(newScope.description, "solidity tasks 2");
    assert.strictEqual(scope, newScope);
  });

  it("should not create a scope if its name clashes with existing task", () => {
    dsl.task("compile"); // no scope

    expectHardhatError(
      () => dsl.scope("compile"),
      ERRORS.TASK_DEFINITIONS.TASK_SCOPE_CLASH,
      "A clash was found while creating scope 'compile', since a task with that name already exists."
    );
  });

  it("should not create a task if its name clashes with existing scope", () => {
    dsl.scope("compile");

    expectHardhatError(
      () => dsl.task("compile"),
      ERRORS.TASK_DEFINITIONS.SCOPE_TASK_CLASH,
      "A clash was found while creating task 'compile', since a scope with that name already exists."
    );
  });

  it("should override task", () => {
    const action = async () => {};

    const builtin = dsl.task("compile", "built-in", action);
    let tasks = dsl.getTaskDefinitions();
    assert.strictEqual(tasks.compile, builtin);

    const custom = dsl.task("compile", "custom", action);
    tasks = dsl.getTaskDefinitions();
    assert.strictEqual(tasks.compile, custom);
  });

  it("should return added tasks", () => {
    const task = dsl.task("compile", "built-in");
    const tasks = dsl.getTaskDefinitions();
    assert.deepEqual(tasks, { compile: task });
  });
});
