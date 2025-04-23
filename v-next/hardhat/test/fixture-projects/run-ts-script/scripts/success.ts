import maybeHre from "hardhat";

if (!maybeHre.tasks.rootTasks.has("test-task")) {
  throw new Error("test task not found");
}
