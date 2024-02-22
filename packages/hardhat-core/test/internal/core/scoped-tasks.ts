import { assert } from "chai";

import { useFixtureProject } from "../../helpers/project";
import { useEnvironment } from "../../helpers/environment";

describe("scoped tasks", () => {
  useFixtureProject("scoped-tasks");
  useEnvironment();

  it("should include scopes in the hre", async function () {
    const scopes = Object.keys(this.env.scopes);

    // vars is a builtin scope
    assert.sameMembers(scopes, ["vars", "my-scope", "another-scope"]);

    assert.strictEqual(this.env.scopes["my-scope"].name, "my-scope");
    assert.strictEqual(
      this.env.scopes["my-scope"].description,
      "my-scope description"
    );

    assert.strictEqual(this.env.scopes["another-scope"].name, "another-scope");
    assert.strictEqual(
      this.env.scopes["another-scope"].description,
      "overridden: another-scope description"
    );
  });

  it("shouldn't include scoped tasks in hre.tasks", async function () {
    assert.isUndefined(this.env.tasks["my-task"]);

    assert.isDefined(this.env.scopes["my-scope"].tasks["my-task"]);
  });

  it("should be possible to run scoped tasks programmatically", async function () {
    const result = await this.env.run({
      scope: "my-scope",
      task: "my-task",
    });

    assert.strictEqual(result, "my-scope/my-task");
  });

  it("should run overridden tasks", async function () {
    const result = await this.env.run({
      scope: "my-scope",
      task: "overridden-task",
    });

    assert.strictEqual(result, "overridden: my-scope/overridden-task");
  });

  it("should run subtasks", async function () {
    const result = await this.env.run({
      scope: "my-scope",
      task: "my-subtask",
    });

    assert.strictEqual(result, "my-scope/my-subtask");
  });

  it("should run overridden subtasks", async function () {
    const result = await this.env.run({
      scope: "my-scope",
      task: "my-overridden-subtask",
    });

    assert.strictEqual(result, "overridden: my-scope/my-overridden-subtask");
  });
});
