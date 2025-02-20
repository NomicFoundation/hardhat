import hre from "hardhat";

if (!hre.tasks.rootTasks.has("test-task")) {
  throw new Error("test task not found");
}
