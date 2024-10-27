import maybeHre from "@ignored/hardhat-vnext";

if (!maybeHre.tasks.rootTasks.has("test-task")) {
  throw new Error("test task not found");
}
