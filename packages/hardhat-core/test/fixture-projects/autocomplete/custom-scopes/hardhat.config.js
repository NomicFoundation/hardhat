const scope1 = scope("scope1");
scope1.task("task1", "task1 description").setAction(async () => {});
scope1
  .task("task2", "task2 description")
  .setAction(async () => {})
  .addFlag("flag1", "flag1 description")
  .addFlag("flag2")
  .addFlag("tmpflag");

const scope2 = scope("scope-2", "scope-2 description");

const scope3 = scope("scope-3", "scope-3 description");
scope3.task("scope-3", "task description").setAction(async () => {});
scope3.task("compile").setAction(async () => {});

module.exports = {
  solidity: "0.7.3",
};
