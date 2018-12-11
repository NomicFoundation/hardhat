import tasks from "../../../../src/core/importable-tasks-dsl";

tasks.task("example2", "example task", async ret => 28);


tasks.task("example", "example task", async (__, { run }) => run("example2"));


