import hre from "@nomicfoundation/hardhat";

if (!hre.tasks.rootTasks.has("test")) {
  throw new Error("test task not found");
}
