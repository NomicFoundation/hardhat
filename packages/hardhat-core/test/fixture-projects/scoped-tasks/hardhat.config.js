scope("my-scope", "my-scope description").task("my-task", async () => {
  return "my-scope/my-task";
});

scope("my-scope").subtask("my-subtask", async () => {
  return "my-scope/my-subtask";
});

scope("my-scope").task("overridden-task", async () => {
  return "my-scope/overridden-task";
});

scope("my-scope").task("overridden-task", async () => {
  return "overridden: my-scope/overridden-task";
});

scope("my-scope").subtask("my-overridden-subtask", async () => {
  return "my-scope/my-overridden-subtask";
});

scope("my-scope").subtask("my-overridden-subtask", async () => {
  return "overridden: my-scope/my-overridden-subtask";
});

scope("another-scope", "another-scope description").task(
  "my-task",
  async () => {
    return "another-scope/my-task";
  }
);

scope("another-scope", "overridden: another-scope description").task(
  "another-task",
  async () => {
    return "another-scope/another-task";
  }
);

module.exports = {
  solidity: "0.8.3",
};
