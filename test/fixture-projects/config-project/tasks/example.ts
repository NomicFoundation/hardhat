import { task } from "../../../../src/core/config/config-env";

task("example2", "example task", async ret => 28);

task("example", "example task", async (__, { run }) => run("example2"));
