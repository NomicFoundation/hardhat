task("my-task")
  .addFlag("myFlag")
  .addFlag("myFlagWithDescription", "Flag description")
  .addParam("param")
  .addParam("paramWithDescription", "Param description")
  .setAction(() => {});

task("task-with-description", "This is the task description");

module.exports = {
  solidity: "0.7.3",
};
