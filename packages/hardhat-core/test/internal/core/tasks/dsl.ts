import { assert } from "chai";

import { ERRORS } from "../../../../src/internal/core/errors-list";
import { TasksDSL } from "../../../../src/internal/core/tasks/dsl";
import { expectHardhatErrorAsync } from "../../../helpers/errors";

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

    assert.equal(task.name, taskName);
    assert.equal(task.description, description);
    assert.equal(task.action, action);
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
    assert.equal(task.action, action);
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

  it("should add a task with scope", () => {
    const task = dsl.task({ name: "compile", scope: "solidity" });
    assert.equal(task.scope, "solidity");
    assert.equal(task.name, "compile");

    let tasks = dsl.getTaskDefinitions();
    assert.isUndefined(tasks["compile"]);

    let scopedTasks = dsl.getScopedTaskDefinitions();
    assert.isDefined(scopedTasks["solidity"]["compile"]);
  });

  it("should add a task with scope and change scope", () => {
    const task = dsl.task({ name: "compile", scope: "solidity" });
    assert.equal(task.scope, "solidity");
    assert.equal(task.name, "compile");

    task.setScope("solidity2");
    assert.equal(task.scope, "solidity2");
    assert.equal(task.name, "compile");

    let tasks = dsl.getTaskDefinitions();
    assert.isUndefined(tasks["compile"]);

    let scopedTasks = dsl.getScopedTaskDefinitions();
    assert.isUndefined(scopedTasks["solidity"]["compile"]);
    assert.isDefined(scopedTasks["solidity2"]["compile"]);
  });

  it("should add a task with scope when a task with same name and no scope exists", () => {
    dsl.task({ name: "compile" }); // no scope

    const task = dsl.task({ name: "compile", scope: "solidity" });
    assert.equal(task.scope, "solidity");
    assert.equal(task.name, "compile");

    let tasks = dsl.getTaskDefinitions();
    assert.isDefined(tasks["compile"]);
    assert.notEqual(task, tasks["compile"]);

    let scopedTasks = dsl.getScopedTaskDefinitions();
    assert.isDefined(scopedTasks["solidity"]["compile"]);
    assert.equal(task, scopedTasks["solidity"]["compile"]);
  });

  it("should add a task without scope and then add scope", () => {
    const task = dsl.task("compile");
    assert.equal(task.scope, undefined);
    assert.equal(task.name, "compile");

    let tasks = dsl.getTaskDefinitions();
    assert.isDefined(tasks["compile"]);

    task.setScope("hello");
    assert.equal(task.scope, "hello");
    assert.equal(task.name, "compile");

    // removes from tasks map and adds to scoped tasks map
    assert.isUndefined(tasks["compile"]);

    let scopedTasks = dsl.getScopedTaskDefinitions();
    assert.isDefined(scopedTasks["hello"]["compile"]);
  });

  it("should override task", () => {
    const action = async () => {};

    const builtin = dsl.task("compile", "built-in", action);
    let tasks = dsl.getTaskDefinitions();
    assert.equal(tasks.compile, builtin);

    const custom = dsl.task("compile", "custom", action);
    tasks = dsl.getTaskDefinitions();
    assert.equal(tasks.compile, custom);
  });

  it("should return added tasks", () => {
    const task = dsl.task("compile", "built-in");
    const tasks = dsl.getTaskDefinitions();
    assert.deepEqual(tasks, { compile: task });
  });
});
