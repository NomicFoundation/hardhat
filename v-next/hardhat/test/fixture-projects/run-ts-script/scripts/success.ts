import hre from "@ignored/hardhat-vnext";

if (!hre.tasks.rootTasks.has("test")) {
  throw new Error("test task not found");
}
