const scope1 = scope("scope1");
scope1.task("task1", "task1 description").setAction(async () => {});
scope1.task("task2", "task2 description").setAction(async () => {});

const scope2 = scope("scope-2", "scope-2 description");

module.exports = {
  solidity: "0.7.3",
};
